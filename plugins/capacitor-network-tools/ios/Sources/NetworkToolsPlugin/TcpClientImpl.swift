import Foundation
import Network

class TcpClientImpl {
    private var connections: [String: NWConnection] = [:]
    private let lock = NSLock()

    func connect(host: String, port: Int, timeout: Int) throws -> String {
        let semaphore = DispatchSemaphore(value: 0)
        var connectError: Error?

        let endpoint = NWEndpoint.hostPort(
            host: NWEndpoint.Host(host),
            port: NWEndpoint.Port(rawValue: UInt16(port))!
        )

        let connection = NWConnection(to: endpoint, using: .tcp)

        connection.stateUpdateHandler = { state in
            switch state {
            case .ready:
                semaphore.signal()
            case .failed(let error):
                connectError = error
                semaphore.signal()
            case .cancelled:
                connectError = NSError(domain: "TCP", code: -1, userInfo: [NSLocalizedDescriptionKey: "Connection cancelled"])
                semaphore.signal()
            default:
                break
            }
        }

        connection.start(queue: DispatchQueue.global(qos: .userInitiated))

        let result = semaphore.wait(timeout: .now() + .milliseconds(timeout))
        if result == .timedOut {
            connection.cancel()
            throw NSError(domain: "TCP", code: -2, userInfo: [NSLocalizedDescriptionKey: "Connection timed out"])
        }

        if let error = connectError {
            throw error
        }

        let socketId = UUID().uuidString
        lock.lock()
        connections[socketId] = connection
        lock.unlock()
        return socketId
    }

    func send(socketId: String, base64Data: String) throws {
        guard let connection = getConnection(socketId) else {
            throw NSError(domain: "TCP", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid socket ID"])
        }

        guard let data = Data(base64Encoded: base64Data) else {
            throw NSError(domain: "TCP", code: -4, userInfo: [NSLocalizedDescriptionKey: "Invalid base64 data"])
        }

        let semaphore = DispatchSemaphore(value: 0)
        var sendError: Error?

        connection.send(content: data, completion: .contentProcessed { error in
            sendError = error
            semaphore.signal()
        })

        semaphore.wait()

        if let error = sendError {
            throw error
        }
    }

    func read(socketId: String, timeout: Int) throws -> String {
        guard let connection = getConnection(socketId) else {
            throw NSError(domain: "TCP", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid socket ID"])
        }

        let semaphore = DispatchSemaphore(value: 0)
        var receivedData: Data?
        var readError: Error?

        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { data, _, _, error in
            receivedData = data
            readError = error
            semaphore.signal()
        }

        let result = semaphore.wait(timeout: .now() + .milliseconds(timeout))
        if result == .timedOut {
            return ""
        }

        if let error = readError {
            throw error
        }

        return receivedData?.base64EncodedString() ?? ""
    }

    func disconnect(socketId: String) {
        lock.lock()
        let connection = connections.removeValue(forKey: socketId)
        lock.unlock()
        connection?.cancel()
    }

    func disconnectAll() {
        lock.lock()
        let all = connections.values
        connections.removeAll()
        lock.unlock()
        all.forEach { $0.cancel() }
    }

    private func getConnection(_ socketId: String) -> NWConnection? {
        lock.lock()
        let conn = connections[socketId]
        lock.unlock()
        return conn
    }
}
