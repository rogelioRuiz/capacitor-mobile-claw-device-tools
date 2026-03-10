import Foundation
import Network
import SystemConfiguration

struct PingResultInfo {
    let reachable: Bool
    let latencyMs: Int
}

struct DiscoveredHostInfo {
    let ip: String
    let hostname: String?
    let openPorts: [Int]
    let latencyMs: Int
}

class NetworkScannerImpl {

    func ping(host: String, timeout: Int, completion: @escaping (PingResultInfo) -> Void) {
        let startTime = DispatchTime.now()

        // Use SCNetworkReachability for host reachability (matches Android's InetAddress.isReachable)
        var zeroAddress = sockaddr_in()
        zeroAddress.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        zeroAddress.sin_family = sa_family_t(AF_INET)

        // Parse host to sockaddr
        if let addr = IPv4Address(host) {
            let bytes = addr.rawValue
            zeroAddress.sin_addr.s_addr = UInt32(bytes[0]) | (UInt32(bytes[1]) << 8) | (UInt32(bytes[2]) << 16) | (UInt32(bytes[3]) << 24)
        }

        let reachability = withUnsafePointer(to: &zeroAddress, {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                SCNetworkReachabilityCreateWithAddress(nil, $0)
            }
        })

        if let reachability = reachability {
            var flags = SCNetworkReachabilityFlags()
            if SCNetworkReachabilityGetFlags(reachability, &flags) {
                let isReachable = flags.contains(.reachable)
                let needsConnection = flags.contains(.connectionRequired)
                if isReachable && !needsConnection {
                    let elapsed = DispatchTime.now().uptimeNanoseconds - startTime.uptimeNanoseconds
                    let latencyMs = Int(elapsed / 1_000_000)
                    completion(PingResultInfo(reachable: true, latencyMs: latencyMs))
                    return
                }
            }
        }

        // Fallback: TCP connect probe to common ports
        let ports: [UInt16] = [80, 443, 7, 22]
        let group = DispatchGroup()
        var reachable = false
        var bestLatency = 0
        let lock = NSLock()

        for port in ports {
            group.enter()
            let endpoint = NWEndpoint.hostPort(
                host: NWEndpoint.Host(host),
                port: NWEndpoint.Port(rawValue: port)!
            )
            let connection = NWConnection(to: endpoint, using: .tcp)
            var done = false

            connection.stateUpdateHandler = { state in
                guard !done else { return }
                switch state {
                case .ready:
                    done = true
                    let elapsed = DispatchTime.now().uptimeNanoseconds - startTime.uptimeNanoseconds
                    let latencyMs = Int(elapsed / 1_000_000)
                    lock.lock()
                    reachable = true
                    if bestLatency == 0 || latencyMs < bestLatency { bestLatency = latencyMs }
                    lock.unlock()
                    connection.cancel()
                    group.leave()
                case .failed, .cancelled:
                    done = true
                    connection.cancel()
                    group.leave()
                default:
                    break
                }
            }

            connection.start(queue: DispatchQueue.global(qos: .userInitiated))

            DispatchQueue.global().asyncAfter(deadline: .now() + .milliseconds(timeout)) {
                guard !done else { return }
                done = true
                connection.cancel()
                group.leave()
            }
        }

        group.notify(queue: .global()) {
            completion(PingResultInfo(reachable: reachable, latencyMs: bestLatency))
        }
    }

    func scan(subnet: String, ports: [Int], timeout: Int, completion: @escaping ([DiscoveredHostInfo]) -> Void) {
        let parts = subnet.split(separator: "/")
        let baseIpStr = String(parts[0])
        let prefixLength = parts.count > 1 ? Int(parts[1]) ?? 24 : 24

        let ipParts = baseIpStr.split(separator: ".").compactMap { UInt32($0) }
        guard ipParts.count == 4 else { completion([]); return }

        let baseAddress = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]
        let hostBits = 32 - prefixLength
        let numHosts = (1 << hostBits) - 2

        let group = DispatchGroup()
        let queue = DispatchQueue(label: "network-scan", attributes: .concurrent)
        let semaphore = DispatchSemaphore(value: 50) // Max 50 concurrent probes
        var hosts: [DiscoveredHostInfo] = []
        let lock = NSLock()

        for i in 1...numHosts {
            group.enter()
            queue.async {
                semaphore.wait()
                let addr = baseAddress + UInt32(i)
                let ip = "\((addr >> 24) & 0xFF).\((addr >> 16) & 0xFF).\((addr >> 8) & 0xFF).\(addr & 0xFF)"

                self.probeHost(ip: ip, ports: ports, timeout: timeout) { result in
                    if let result = result {
                        lock.lock()
                        hosts.append(result)
                        lock.unlock()
                    }
                    semaphore.signal()
                    group.leave()
                }
            }
        }

        group.notify(queue: .global()) {
            completion(hosts.sorted { $0.ip < $1.ip })
        }
    }

    private func probeHost(ip: String, ports: [Int], timeout: Int, completion: @escaping (DiscoveredHostInfo?) -> Void) {
        let startTime = DispatchTime.now()
        let group = DispatchGroup()
        var openPorts: [Int] = []
        let lock = NSLock()
        var anyOpen = false

        for port in ports {
            group.enter()
            let endpoint = NWEndpoint.hostPort(
                host: NWEndpoint.Host(ip),
                port: NWEndpoint.Port(rawValue: UInt16(port))!
            )
            let connection = NWConnection(to: endpoint, using: .tcp)
            var done = false

            connection.stateUpdateHandler = { state in
                guard !done else { return }
                switch state {
                case .ready:
                    done = true
                    anyOpen = true
                    lock.lock()
                    openPorts.append(port)
                    lock.unlock()
                    connection.cancel()
                    group.leave()
                case .failed, .cancelled:
                    done = true
                    connection.cancel()
                    group.leave()
                default:
                    break
                }
            }

            connection.start(queue: DispatchQueue.global(qos: .utility))

            DispatchQueue.global().asyncAfter(deadline: .now() + .milliseconds(timeout)) {
                guard !done else { return }
                done = true
                connection.cancel()
                group.leave()
            }
        }

        group.notify(queue: .global()) {
            guard anyOpen else { completion(nil); return }

            let elapsed = DispatchTime.now().uptimeNanoseconds - startTime.uptimeNanoseconds
            let latencyMs = Int(elapsed / 1_000_000)

            completion(DiscoveredHostInfo(
                ip: ip,
                hostname: nil, // DNS reverse lookup could be added
                openPorts: openPorts.sorted(),
                latencyMs: latencyMs
            ))
        }
    }
}
