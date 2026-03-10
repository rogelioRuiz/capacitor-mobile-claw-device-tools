import Foundation
import NIOCore
import NIOPosix
import NIOSSH
import NIOTransportServices

struct ExecResult {
    let stdout: String
    let stderr: String
    let exitCode: Int
}

// MARK: - Auth Delegate

private struct PasswordAuthDelegate: NIOSSHClientUserAuthenticationDelegate {
    let username: String
    let password: String

    func nextAuthenticationType(
        availableMethods: NIOSSHAvailableUserAuthenticationMethods,
        nextChallengePromise: EventLoopPromise<NIOSSHUserAuthenticationOffer?>
    ) {
        guard availableMethods.contains(.password) else {
            nextChallengePromise.succeed(nil)
            return
        }
        nextChallengePromise.succeed(
            NIOSSHUserAuthenticationOffer(
                username: username,
                serviceName: "",
                offer: .password(.init(password: password))
            )
        )
    }
}

private struct PrivateKeyAuthDelegate: NIOSSHClientUserAuthenticationDelegate {
    let username: String
    let privateKey: NIOSSHPrivateKey
    let password: String?

    func nextAuthenticationType(
        availableMethods: NIOSSHAvailableUserAuthenticationMethods,
        nextChallengePromise: EventLoopPromise<NIOSSHUserAuthenticationOffer?>
    ) {
        guard availableMethods.contains(.publicKey) else {
            nextChallengePromise.succeed(nil)
            return
        }
        nextChallengePromise.succeed(
            NIOSSHUserAuthenticationOffer(
                username: username,
                serviceName: "",
                offer: .privateKey(.init(privateKey: privateKey))
            )
        )
    }
}

private struct AcceptAllHostKeysDelegate: NIOSSHClientServerAuthenticationDelegate {
    func validateHostKey(hostKey: NIOSSHPublicKey, validationCompletePromise: EventLoopPromise<Void>) {
        validationCompletePromise.succeed(())
    }
}

// MARK: - Exec Channel Handler

private final class ExecChannelHandler: ChannelDuplexHandler {
    typealias InboundIn = SSHChannelData
    typealias InboundOut = ByteBuffer
    typealias OutboundIn = ByteBuffer
    typealias OutboundOut = SSHChannelData

    private var stdoutBuffer = Data()
    private var stderrBuffer = Data()
    private var exitStatus: Int?
    let resultPromise: EventLoopPromise<ExecResult>

    init(resultPromise: EventLoopPromise<ExecResult>) {
        self.resultPromise = resultPromise
    }

    func channelRead(context: ChannelHandlerContext, data: NIOAny) {
        let channelData = self.unwrapInboundIn(data)

        switch channelData.type {
        case .channel:
            switch channelData.data {
            case .byteBuffer(var buffer):
                if let bytes = buffer.readBytes(length: buffer.readableBytes) {
                    stdoutBuffer.append(contentsOf: bytes)
                }
            case .fileRegion:
                break
            }
        case .stdErr:
            switch channelData.data {
            case .byteBuffer(var buffer):
                if let bytes = buffer.readBytes(length: buffer.readableBytes) {
                    stderrBuffer.append(contentsOf: bytes)
                }
            case .fileRegion:
                break
            }
        default:
            break
        }
    }

    func userInboundEventTriggered(context: ChannelHandlerContext, event: Any) {
        if let exitEvent = event as? SSHChannelRequestEvent.ExitStatus {
            exitStatus = Int(exitEvent.exitStatus)
        }
        context.fireUserInboundEventTriggered(event)
    }

    func channelInactive(context: ChannelHandlerContext) {
        let result = ExecResult(
            stdout: String(data: stdoutBuffer, encoding: .utf8) ?? "",
            stderr: String(data: stderrBuffer, encoding: .utf8) ?? "",
            exitCode: exitStatus ?? -1
        )
        resultPromise.succeed(result)
        context.fireChannelInactive()
    }

    func errorCaught(context: ChannelHandlerContext, error: Error) {
        resultPromise.fail(error)
        context.close(promise: nil)
    }
}

// MARK: - SSH Session Wrapper

private class NIOSSHSessionWrapper {
    let channel: Channel
    let group: EventLoopGroup
    let host: String
    let port: Int
    let username: String
    let password: String?
    let privateKeyPEM: String?

    var isConnected: Bool {
        channel.isActive
    }

    init(channel: Channel, group: EventLoopGroup, host: String, port: Int, username: String, password: String?, privateKeyPEM: String?) {
        self.channel = channel
        self.group = group
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.privateKeyPEM = privateKeyPEM
    }

    func disconnect() {
        try? channel.close().wait()
    }
}

// MARK: - SshClient

class SshClient {
    private var sessions: [String: NIOSSHSessionWrapper] = [:]
    private let lock = NSLock()
    private let registry: SessionRegistry
    private let group: NIOTSEventLoopGroup

    init(registry: SessionRegistry) {
        self.registry = registry
        self.group = NIOTSEventLoopGroup()
    }

    deinit {
        try? group.syncShutdownGracefully()
    }

    func connect(host: String, port: Int, username: String, password: String?, privateKey: String?) throws -> String {
        let session = try createSession(host: host, port: port, username: username, password: password, privateKey: privateKey)
        let sessionId = UUID().uuidString
        lock.lock()
        sessions[sessionId] = session
        lock.unlock()
        registry.register(sessionId: sessionId, params: [
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

        let resultPromise = session.channel.eventLoop.makePromise(of: ExecResult.self)

        let createChannel: EventLoopFuture<Channel> = session.channel.pipeline.handler(type: NIOSSHHandler.self).flatMap { handler in
            let childPromise = session.channel.eventLoop.makePromise(of: Channel.self)
            handler.createChannel(childPromise) { childChannel, _ in
                childChannel.pipeline.addHandler(ExecChannelHandler(resultPromise: resultPromise))
            }
            return childPromise.futureResult
        }

        let result: ExecResult = try createChannel.flatMap { childChannel -> EventLoopFuture<ExecResult> in
            let execRequest = SSHChannelRequestEvent.ExecRequest(
                command: command,
                wantReply: true
            )
            return childChannel.triggerUserOutboundEvent(execRequest).flatMap {
                resultPromise.futureResult
            }
        }.wait()

        return result
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

        let sftp = try openSftpChannel(session: session)
        defer { sftp.close() }

        return try sftp.listDirectory(path: path)
    }

    func sftpDownload(sessionId: String, remotePath: String) throws -> String {
        let session = try getOrReconnect(sessionId)
        registry.touch(sessionId)

        let sftp = try openSftpChannel(session: session)
        defer { sftp.close() }

        let data = try sftp.readFile(path: remotePath)
        return data.base64EncodedString()
    }

    func sftpUpload(sessionId: String, remotePath: String, base64Data: String) throws {
        let session = try getOrReconnect(sessionId)
        registry.touch(sessionId)

        guard let data = Data(base64Encoded: base64Data) else {
            throw NSError(domain: "SFTP", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid base64 data"])
        }

        let sftp = try openSftpChannel(session: session)
        defer { sftp.close() }

        try sftp.writeFile(path: remotePath, data: data)
    }

    // MARK: - Private

    private func createSession(host: String, port: Int, username: String, password: String?, privateKey: String?) throws -> NIOSSHSessionWrapper {
        let authDelegate: NIOSSHClientUserAuthenticationDelegate
        if let key = privateKey {
            let sshKey = try parsePrivateKey(key)
            authDelegate = PrivateKeyAuthDelegate(username: username, privateKey: sshKey, password: password)
        } else if let pass = password {
            authDelegate = PasswordAuthDelegate(username: username, password: pass)
        } else {
            throw NSError(domain: "SSH", code: -1, userInfo: [NSLocalizedDescriptionKey: "Either password or privateKey is required"])
        }

        let bootstrap = NIOTSConnectionBootstrap(group: group)
            .channelInitializer { channel in
                channel.pipeline.addHandlers([
                    NIOSSHHandler(
                        role: .client(
                            .init(
                                userAuthDelegate: authDelegate,
                                serverAuthDelegate: AcceptAllHostKeysDelegate()
                            )
                        ),
                        allocator: channel.allocator,
                        inboundChildChannelInitializer: nil
                    )
                ])
            }
            .connectTimeout(.seconds(30))

        let channel = try bootstrap.connect(host: host, port: port).wait()

        return NIOSSHSessionWrapper(
            channel: channel,
            group: group,
            host: host,
            port: port,
            username: username,
            password: password,
            privateKeyPEM: privateKey
        )
    }

    private func parsePrivateKey(_ pem: String) throws -> NIOSSHPrivateKey {
        // Try Ed25519 first, then P256
        if let key = try? NIOSSHPrivateKey(ed25519Key: .init(rawRepresentation: Data(pemDecoded: pem))) {
            return key
        }
        if let key = try? NIOSSHPrivateKey(p256Key: .init(rawRepresentation: Data(pemDecoded: pem))) {
            return key
        }
        throw NSError(domain: "SSH", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unsupported private key format. Supported: Ed25519, P-256 ECDSA"])
    }

    private func getOrReconnect(_ sessionId: String) throws -> NIOSSHSessionWrapper {
        lock.lock()
        let existing = sessions[sessionId]
        lock.unlock()

        if let session = existing, session.isConnected {
            return session
        }

        return try reconnect(sessionId)
    }

    private func reconnect(_ sessionId: String) throws -> NIOSSHSessionWrapper {
        guard let params = registry.getParams(sessionId: sessionId) else {
            throw NSError(domain: "SSH", code: -3, userInfo: [NSLocalizedDescriptionKey: "SSH session expired or unknown: \(sessionId)"])
        }

        guard let host = params["host"] as? String,
              let username = params["username"] as? String else {
            throw NSError(domain: "SSH", code: -4, userInfo: [NSLocalizedDescriptionKey: "Stored params missing host or username"])
        }

        let port = params["port"] as? Int ?? 22
        let password = params["password"] as? String
        let privateKey = params["privateKey"] as? String

        let session = try createSession(host: host, port: port, username: username, password: password, privateKey: privateKey)
        lock.lock()
        sessions[sessionId] = session
        lock.unlock()
        return session
    }

    private func openSftpChannel(session: NIOSSHSessionWrapper) throws -> SftpClient {
        return try SftpClient.open(on: session.channel)
    }
}

// MARK: - PEM Decoding Helper

private extension Data {
    init(pemDecoded pem: String) throws {
        let lines = pem.split(separator: "\n").filter { !$0.hasPrefix("-----") }
        let base64 = lines.joined()
        guard let data = Data(base64Encoded: base64) else {
            throw NSError(domain: "SSH", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid PEM data"])
        }
        self = data
    }
}
