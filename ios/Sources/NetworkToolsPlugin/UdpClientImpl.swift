import Foundation
import Network

class UdpClientImpl {

    func send(host: String, port: Int, base64Data: String) throws {
        guard let data = Data(base64Encoded: base64Data) else {
            throw NSError(domain: "UDP", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid base64 data"])
        }

        let endpoint = NWEndpoint.hostPort(
            host: NWEndpoint.Host(host),
            port: NWEndpoint.Port(rawValue: UInt16(port))!
        )

        let connection = NWConnection(to: endpoint, using: .udp)
        let semaphore = DispatchSemaphore(value: 0)
        var sendError: Error?

        connection.stateUpdateHandler = { state in
            if case .ready = state {
                connection.send(content: data, completion: .contentProcessed { error in
                    sendError = error
                    connection.cancel()
                    semaphore.signal()
                })
            } else if case .failed(let error) = state {
                sendError = error
                semaphore.signal()
            }
        }

        connection.start(queue: DispatchQueue.global(qos: .userInitiated))
        semaphore.wait()

        if let error = sendError {
            throw error
        }
    }

    func broadcast(port: Int, base64Data: String) throws {
        // iOS doesn't have a direct broadcast API via Network.framework
        // Use POSIX sockets for UDP broadcast
        guard let data = Data(base64Encoded: base64Data) else {
            throw NSError(domain: "UDP", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid base64 data"])
        }

        let sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP)
        guard sock >= 0 else {
            throw NSError(domain: "UDP", code: -2, userInfo: [NSLocalizedDescriptionKey: "Failed to create socket"])
        }
        defer { close(sock) }

        var broadcastEnable: Int32 = 1
        setsockopt(sock, SOL_SOCKET, SO_BROADCAST, &broadcastEnable, socklen_t(MemoryLayout<Int32>.size))

        var addr = sockaddr_in()
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = UInt16(port).bigEndian
        addr.sin_addr.s_addr = INADDR_BROADCAST

        let sent = data.withUnsafeBytes { buffer -> Int in
            withUnsafePointer(to: &addr) { addrPtr in
                addrPtr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPtr in
                    sendto(sock, buffer.baseAddress, data.count, 0, sockaddrPtr, socklen_t(MemoryLayout<sockaddr_in>.size))
                }
            }
        }

        if sent < 0 {
            throw NSError(domain: "UDP", code: -3, userInfo: [NSLocalizedDescriptionKey: "Broadcast send failed (errno: \(errno))"])
        }
    }
}
