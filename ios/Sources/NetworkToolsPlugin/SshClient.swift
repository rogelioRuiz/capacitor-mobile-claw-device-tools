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

    func connect(host: String, port: Int, username: String, password: String?, privateKey: String?) throws -> String {
        let session = NMSSHSession(host: host, port: port, andUsername: username)
        session.connect()

        guard session.isConnected else {
            throw NSError(domain: "SSH", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to connect to \(host):\(port)"])
        }

        // Authenticate
        if let key = privateKey {
            session.authenticate(byInMemoryPublicKey: nil, privateKey: key, andPassword: password)
        } else if let pass = password {
            session.authenticate(byPassword: pass)
        }

        guard session.isAuthorized else {
            session.disconnect()
            throw NSError(domain: "SSH", code: -2, userInfo: [NSLocalizedDescriptionKey: "Authentication failed for \(username)@\(host)"])
        }

        let sessionId = UUID().uuidString
        lock.lock()
        sessions[sessionId] = session
        lock.unlock()
        return sessionId
    }

    func exec(sessionId: String, command: String, timeout: Int) throws -> ExecResult {
        guard let session = getSession(sessionId) else {
            throw NSError(domain: "SSH", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid session ID: \(sessionId)"])
        }

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
    }

    func disconnectAll() {
        lock.lock()
        let allSessions = sessions.values
        sessions.removeAll()
        lock.unlock()
        allSessions.forEach { $0.disconnect() }
    }

    // MARK: - SFTP

    func sftpList(sessionId: String, path: String) throws -> [[String: Any]] {
        guard let session = getSession(sessionId) else {
            throw NSError(domain: "SSH", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid session ID"])
        }

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
        guard let session = getSession(sessionId) else {
            throw NSError(domain: "SSH", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid session ID"])
        }

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
        guard let session = getSession(sessionId) else {
            throw NSError(domain: "SSH", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid session ID"])
        }

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

    private func getSession(_ sessionId: String) -> NMSSHSession? {
        lock.lock()
        let session = sessions[sessionId]
        lock.unlock()
        return session
    }
}
