import Foundation
import Network

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

        let endpoint = NWEndpoint.hostPort(
            host: NWEndpoint.Host(host),
            port: NWEndpoint.Port(rawValue: 80)! // TCP connect probe
        )

        let connection = NWConnection(to: endpoint, using: .tcp)
        var completed = false

        connection.stateUpdateHandler = { state in
            guard !completed else { return }
            switch state {
            case .ready:
                completed = true
                let elapsed = DispatchTime.now().uptimeNanoseconds - startTime.uptimeNanoseconds
                let latencyMs = Int(elapsed / 1_000_000)
                connection.cancel()
                completion(PingResultInfo(reachable: true, latencyMs: latencyMs))
            case .failed, .cancelled:
                completed = true
                connection.cancel()
                completion(PingResultInfo(reachable: false, latencyMs: 0))
            default:
                break
            }
        }

        connection.start(queue: DispatchQueue.global(qos: .userInitiated))

        // Timeout
        DispatchQueue.global().asyncAfter(deadline: .now() + .milliseconds(timeout)) {
            guard !completed else { return }
            completed = true
            connection.cancel()
            completion(PingResultInfo(reachable: false, latencyMs: 0))
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
