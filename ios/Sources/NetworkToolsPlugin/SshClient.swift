import Foundation
import NMSSH

struct ExecResult {
    let stdout: String
    let stderr: String
    let exitCode: Int
}

class SshClient {
    private var sessions: [String: NMSSHSession] = [:]
    private let lock = NSLock()
    private let registry: SessionRegistry

    init(registry: SessionRegistry) {
        self.registry = registry
    }

    func connect(host: String, port: Int, username: String, password: String?, privateKey: String?) throws -> String {
        let session = try createNMSSHSession(host: host, port: port, username: username, password: password, privateKey: privateKey)
        let sessionId = UUID().uuidString
        lock.lock()
        sessions[sessionId] = session
        lock.unlock()
        registry.register(sessionId, params: [
            "host": host,
            "port": port,
            "username": username,
            "password": password as Any?,
            "privateKey": privateKey as Any?,
        ])
        return sessionId
    }

    func exec(sessionId: String, command: String, timeout: Int) throws -> ExecResult {
        let session = try getOrReconnect(sessionId)
        registry.touch(sessionId)

        session.channel.requestTerminal = false
        session.channel.type = NMSSHChannelType.exec

        var error: NSError?
        let response = session.channel.execute(command, error: &error, timeout: NSNumber(value: timeout / 1000))

        if let error = error {
            throw error
        }

        return ExecResult(
            stdout: response ?? "",
            stderr: session.channel.lastResponse ?? "",
            exitCode: Int(session.channel.exitStatus)
        )
    }

    func disconnect(sessionId: String) {
        lock.lock()
        let session = sessions.removeValue(forKey: sessionId)
        lock.unlock()
        session?.disconnect()
        registry.evict(sessionId)
    }

    func disconnectAll() {
        lock.lock()
        let allSessions = Array(sessions.values)
        sessions.removeAll()
        lock.unlock()
        allSessions.forEach { $0.disconnect() }
        registry.evictAll()
    }

    // MARK: - SFTP

    func sftpList(sessionId: String, path: String) throws -> [[String: Any]] {
        let session = try getOrReconnect(sessionId)
        registry.touch(sessionId)

        let sftp = NMSFTP(session: session)
        sftp.connect()

        guard sftp.isConnected else {
            throw NSError(domain: "SFTP", code: -1, userInfo: [NSLocalizedDescriptionKey: "SFTP connection failed"])
        }

        defer { sftp.disconnect() }

        guard let files = sftp.contentsOfDirectory(atPath: path) as? [NMSFTPFile] else {
            return []
        }

        return files.compactMap { file -> [String: Any]? in
            guard file.filename != "." && file.filename != ".." else { return nil }
            return [
                "name": file.filename ?? "",
                "path": "\(path)/\(file.filename ?? "")",
                "size": file.fileSize,
                "isDirectory": file.isDirectory,
                "modifiedAt": file.modificationDate?.description ?? "",
                "permissions": file.permissions ?? ""
            ]
        }
    }

    func sftpDownload(sessionId: String, remotePath: String) throws -> String {
        let session = try getOrReconnect(sessionId)
        registry.touch(sessionId)

        let sftp = NMSFTP(session: session)
        sftp.connect()

        guard sftp.isConnected else {
            throw NSError(domain: "SFTP", code: -1, userInfo: [NSLocalizedDescriptionKey: "SFTP connection failed"])
        }

        defer { sftp.disconnect() }

        guard let data = sftp.contents(atPath: remotePath) else {
            throw NSError(domain: "SFTP", code: -2, userInfo: [NSLocalizedDescriptionKey: "Failed to download file: \(remotePath)"])
        }

        return data.base64EncodedString()
    }

    func sftpUpload(sessionId: String, remotePath: String, base64Data: String) throws {
        let session = try getOrReconnect(sessionId)
        registry.touch(sessionId)

        guard let data = Data(base64Encoded: base64Data) else {
            throw NSError(domain: "SFTP", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid base64 data"])
        }

        let sftp = NMSFTP(session: session)
        sftp.connect()

        guard sftp.isConnected else {
            throw NSError(domain: "SFTP", code: -1, userInfo: [NSLocalizedDescriptionKey: "SFTP connection failed"])
        }

        defer { sftp.disconnect() }

        let success = sftp.writeContents(data, toFileAtPath: remotePath)
        if !success {
            throw NSError(domain: "SFTP", code: -3, userInfo: [NSLocalizedDescriptionKey: "Failed to upload file: \(remotePath)"])
        }
    }

    // MARK: - Private

    private func createNMSSHSession(host: String, port: Int, username: String, password: String?, privateKey: String?) throws -> NMSSHSession {
        let session = NMSSHSession(host: host, port: port, andUsername: username)
        session.connect()

        guard session.isConnected else {
            throw NSError(domain: "SSH", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to connect to \(host):\(port)"])
        }

        if let key = privateKey {
            session.authenticate(byInMemoryPublicKey: nil, privateKey: key, andPassword: password)
        } else if let pass = password {
            session.authenticate(byPassword: pass)
        }

        guard session.isAuthorized else {
            session.disconnect()
            throw NSError(domain: "SSH", code: -2, userInfo: [NSLocalizedDescriptionKey: "Authentication failed for \(username)@\(host)"])
        }

        session.keepAliveInterval = 30

        return session
    }

    private func getOrReconnect(_ sessionId: String) throws -> NMSSHSession {
        lock.lock()
        let existing = sessions[sessionId]
        lock.unlock()

        if let session = existing, session.isConnected {
            return session
        }

        return try reconnect(sessionId)
    }

    private func reconnect(_ sessionId: String) throws -> NMSSHSession {
        guard let params = registry.getParams(sessionId) else {
            throw NSError(domain: "SSH", code: -3, userInfo: [NSLocalizedDescriptionKey: "SSH session expired or unknown: \(sessionId)"])
        }

        guard let host = params["host"] as? String,
              let username = params["username"] as? String else {
            throw NSError(domain: "SSH", code: -4, userInfo: [NSLocalizedDescriptionKey: "Stored params missing host or username"])
        }

        let port = params["port"] as? Int ?? 22
        let password = params["password"] as? String
        let privateKey = params["privateKey"] as? String

        let session = try createNMSSHSession(host: host, port: port, username: username, password: password, privateKey: privateKey)
        lock.lock()
        sessions[sessionId] = session
        lock.unlock()
        return session
    }
}
