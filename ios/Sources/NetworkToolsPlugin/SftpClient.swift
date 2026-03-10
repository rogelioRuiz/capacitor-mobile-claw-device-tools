import Foundation
import NIOCore
import NIOSSH

// MARK: - SFTP Protocol Constants

private enum SftpPacketType: UInt8 {
    case init_ = 1
    case version = 2
    case open = 3
    case close = 4
    case read = 5
    case write = 6
    case opendir = 11
    case readdir = 12
    case stat = 17
    case name = 104
    case attrs = 105
    case status = 101
    case handle = 102
    case data = 103
}

private enum SftpStatusCode: UInt32 {
    case ok = 0
    case eof = 1
    case noSuchFile = 2
    case permissionDenied = 3
    case failure = 4
}

private struct SftpFileAttributes {
    var flags: UInt32 = 0
    var size: UInt64 = 0
    var uid: UInt32 = 0
    var gid: UInt32 = 0
    var permissions: UInt32 = 0
    var atime: UInt32 = 0
    var mtime: UInt32 = 0
}

// MARK: - SFTP Channel Handler

private final class SftpChannelHandler: ChannelDuplexHandler {
    typealias InboundIn = SSHChannelData
    typealias InboundOut = ByteBuffer
    typealias OutboundIn = ByteBuffer
    typealias OutboundOut = SSHChannelData

    private var responseBuffer = Data()
    private var pendingRequests: [UInt32: EventLoopPromise<Data>] = [:]
    private let initPromise: EventLoopPromise<Void>
    private var initialized = false

    init(initPromise: EventLoopPromise<Void>) {
        self.initPromise = initPromise
    }

    func channelRead(context: ChannelHandlerContext, data: NIOAny) {
        let channelData = self.unwrapInboundIn(data)
        guard channelData.type == .channel else { return }

        switch channelData.data {
        case .byteBuffer(var buffer):
            if let bytes = buffer.readBytes(length: buffer.readableBytes) {
                responseBuffer.append(contentsOf: bytes)
            }
        case .fileRegion:
            break
        }

        processResponses(context: context)
    }

    private func processResponses(context: ChannelHandlerContext) {
        while responseBuffer.count >= 4 {
            let length = responseBuffer.withUnsafeBytes { ptr -> UInt32 in
                ptr.load(as: UInt32.self).bigEndian
            }
            guard responseBuffer.count >= Int(length) + 4 else { return }

            let packetData = Data(responseBuffer[4 ..< Int(length) + 4])
            responseBuffer.removeFirst(Int(length) + 4)

            guard !packetData.isEmpty else { continue }
            let type = packetData[0]

            if !initialized && type == SftpPacketType.version.rawValue {
                initialized = true
                initPromise.succeed(())
                continue
            }

            guard packetData.count >= 5 else { continue }
            let requestId = packetData.withUnsafeBytes { ptr -> UInt32 in
                ptr.load(fromByteOffset: 1, as: UInt32.self).bigEndian
            }

            if let promise = pendingRequests.removeValue(forKey: requestId) {
                promise.succeed(packetData)
            }
        }
    }

    func sendRequest(context: ChannelHandlerContext, data: Data, requestId: UInt32) -> EventLoopFuture<Data> {
        let promise = context.eventLoop.makePromise(of: Data.self)
        pendingRequests[requestId] = promise

        var lengthPrefix = Data(count: 4)
        let len = UInt32(data.count)
        lengthPrefix.withUnsafeMutableBytes { ptr in
            ptr.storeBytes(of: len.bigEndian, as: UInt32.self)
        }

        var buffer = context.channel.allocator.buffer(capacity: data.count + 4)
        buffer.writeBytes(lengthPrefix)
        buffer.writeBytes(data)

        let channelData = SSHChannelData(type: .channel, data: .byteBuffer(buffer))
        context.writeAndFlush(self.wrapOutboundOut(channelData), promise: nil)

        return promise.futureResult
    }

    func sendInit(context: ChannelHandlerContext) {
        var data = Data()
        data.append(SftpPacketType.init_.rawValue)
        data.appendUInt32(3) // protocol version 3

        var lengthPrefix = Data(count: 4)
        let len = UInt32(data.count)
        lengthPrefix.withUnsafeMutableBytes { ptr in
            ptr.storeBytes(of: len.bigEndian, as: UInt32.self)
        }

        var buffer = context.channel.allocator.buffer(capacity: data.count + 4)
        buffer.writeBytes(lengthPrefix)
        buffer.writeBytes(data)

        let channelData = SSHChannelData(type: .channel, data: .byteBuffer(buffer))
        context.writeAndFlush(self.wrapOutboundOut(channelData), promise: nil)
    }

    func errorCaught(context: ChannelHandlerContext, error: Error) {
        if !initialized {
            initPromise.fail(error)
        }
        for (_, promise) in pendingRequests {
            promise.fail(error)
        }
        pendingRequests.removeAll()
    }

    func channelInactive(context: ChannelHandlerContext) {
        if !initialized {
            initPromise.fail(NSError(domain: "SFTP", code: -1, userInfo: [NSLocalizedDescriptionKey: "SFTP channel closed before init"]))
        }
        for (_, promise) in pendingRequests {
            promise.fail(NSError(domain: "SFTP", code: -1, userInfo: [NSLocalizedDescriptionKey: "SFTP channel closed"]))
        }
        pendingRequests.removeAll()
        context.fireChannelInactive()
    }
}

// MARK: - SFTP Client

class SftpClient {
    private let channel: Channel
    private let handler: SftpChannelHandler
    private var nextRequestId: UInt32 = 1

    private init(channel: Channel, handler: SftpChannelHandler) {
        self.channel = channel
        self.handler = handler
    }

    static func open(on parentChannel: Channel) throws -> SftpClient {
        let initPromise = parentChannel.eventLoop.makePromise(of: Void.self)
        let sftpHandler = SftpChannelHandler(initPromise: initPromise)

        let childChannelFuture: EventLoopFuture<Channel> = parentChannel.pipeline.handler(type: NIOSSHHandler.self).flatMap { sshHandler in
            let childPromise = parentChannel.eventLoop.makePromise(of: Channel.self)
            sshHandler.createChannel(childPromise) { childChannel, _ in
                childChannel.pipeline.addHandler(sftpHandler)
            }
            return childPromise.futureResult
        }

        let childChannel = try childChannelFuture.flatMap { childChannel -> EventLoopFuture<Channel> in
            let subsystemRequest = SSHChannelRequestEvent.SubsystemRequest(
                subsystem: "sftp",
                wantReply: true
            )
            return childChannel.triggerUserOutboundEvent(subsystemRequest).map { childChannel }
        }.wait()

        // Send SFTP init
        childChannel.eventLoop.execute {
            sftpHandler.sendInit(context: sftpHandler as! ChannelHandlerContext)
        }

        // Wait for SFTP version response
        // We need a different approach — use the channel pipeline context
        // Actually, let's send init via the channel directly
        var initData = Data()
        initData.append(SftpPacketType.init_.rawValue)
        initData.appendUInt32(3)

        var lengthPrefix = Data(count: 4)
        let len = UInt32(initData.count)
        lengthPrefix.withUnsafeMutableBytes { ptr in
            ptr.storeBytes(of: len.bigEndian, as: UInt32.self)
        }

        var buffer = childChannel.allocator.buffer(capacity: initData.count + 4)
        buffer.writeBytes(lengthPrefix)
        buffer.writeBytes(initData)

        let channelData = SSHChannelData(type: .channel, data: .byteBuffer(buffer))
        try childChannel.writeAndFlush(channelData).wait()

        try initPromise.futureResult.wait()

        return SftpClient(channel: childChannel, handler: sftpHandler)
    }

    func close() {
        try? channel.close().wait()
    }

    func listDirectory(path: String) throws -> [[String: Any]] {
        let handle = try openDir(path: path)
        defer { try? closeHandle(handle: handle) }

        var results: [[String: Any]] = []

        while true {
            let entries = try readDir(handle: handle)
            if entries.isEmpty { break }
            results.append(contentsOf: entries)
        }

        return results.filter { ($0["name"] as? String) != "." && ($0["name"] as? String) != ".." }
    }

    func readFile(path: String) throws -> Data {
        let handle = try openFile(path: path, flags: 0x00000001) // SSH_FXF_READ
        defer { try? closeHandle(handle: handle) }

        var result = Data()
        var offset: UInt64 = 0
        let chunkSize: UInt32 = 32768

        while true {
            let chunk = try readData(handle: handle, offset: offset, length: chunkSize)
            if chunk.isEmpty { break }
            result.append(chunk)
            offset += UInt64(chunk.count)
        }

        return result
    }

    func writeFile(path: String, data: Data) throws {
        let handle = try openFile(path: path, flags: 0x0000001A) // SSH_FXF_WRITE | SSH_FXF_CREAT | SSH_FXF_TRUNC
        defer { try? closeHandle(handle: handle) }

        var offset: UInt64 = 0
        let chunkSize = 32768

        while offset < UInt64(data.count) {
            let end = min(Int(offset) + chunkSize, data.count)
            let chunk = data[Int(offset) ..< end]
            try writeData(handle: handle, offset: offset, data: Data(chunk))
            offset += UInt64(chunk.count)
        }
    }

    // MARK: - Low-level SFTP Operations

    private func sendRequest(_ data: Data) throws -> Data {
        let requestId = nextRequestId
        nextRequestId += 1

        let result = try channel.eventLoop.flatSubmit { [handler, channel] () -> EventLoopFuture<Data> in
            guard let context = try? (channel.pipeline.syncOperations.context(handler: handler)) else {
                return channel.eventLoop.makeFailedFuture(
                    NSError(domain: "SFTP", code: -1, userInfo: [NSLocalizedDescriptionKey: "Handler context not found"])
                )
            }
            return handler.sendRequest(context: context, data: data, requestId: requestId)
        }.wait()

        return result
    }

    private func openDir(path: String) throws -> Data {
        var data = Data()
        data.append(SftpPacketType.opendir.rawValue)
        data.appendUInt32(nextRequestId)
        data.appendString(path)

        let response = try sendRequest(data)
        guard response.count > 5, response[0] == SftpPacketType.handle.rawValue else {
            throw sftpError(from: response, fallback: "Failed to open directory: \(path)")
        }

        return extractHandle(from: response)
    }

    private func readDir(handle: Data) throws -> [[String: Any]] {
        var data = Data()
        data.append(SftpPacketType.readdir.rawValue)
        data.appendUInt32(nextRequestId)
        data.appendLengthPrefixed(handle)

        let response = try sendRequest(data)
        guard !response.isEmpty else { return [] }

        if response[0] == SftpPacketType.status.rawValue {
            let statusCode = response.count >= 9 ? response.readUInt32(at: 5) : 0
            if statusCode == SftpStatusCode.eof.rawValue { return [] }
            throw sftpError(from: response, fallback: "readdir failed")
        }

        guard response[0] == SftpPacketType.name.rawValue else { return [] }

        return parseNameResponse(response)
    }

    private func openFile(path: String, flags: UInt32) throws -> Data {
        var data = Data()
        data.append(SftpPacketType.open.rawValue)
        data.appendUInt32(nextRequestId)
        data.appendString(path)
        data.appendUInt32(flags)
        data.appendUInt32(0) // attrs flags — no attrs

        let response = try sendRequest(data)
        guard response.count > 5, response[0] == SftpPacketType.handle.rawValue else {
            throw sftpError(from: response, fallback: "Failed to open file: \(path)")
        }

        return extractHandle(from: response)
    }

    private func readData(handle: Data, offset: UInt64, length: UInt32) throws -> Data {
        var data = Data()
        data.append(SftpPacketType.read.rawValue)
        data.appendUInt32(nextRequestId)
        data.appendLengthPrefixed(handle)
        data.appendUInt64(offset)
        data.appendUInt32(length)

        let response = try sendRequest(data)

        if response[0] == SftpPacketType.status.rawValue {
            let statusCode = response.count >= 9 ? response.readUInt32(at: 5) : 0
            if statusCode == SftpStatusCode.eof.rawValue { return Data() }
            throw sftpError(from: response, fallback: "read failed")
        }

        guard response[0] == SftpPacketType.data.rawValue, response.count > 9 else { return Data() }

        let dataLen = response.readUInt32(at: 5)
        let start = 9
        let end = min(start + Int(dataLen), response.count)
        return Data(response[start ..< end])
    }

    private func writeData(handle: Data, offset: UInt64, data writeData: Data) throws {
        var data = Data()
        data.append(SftpPacketType.write.rawValue)
        data.appendUInt32(nextRequestId)
        data.appendLengthPrefixed(handle)
        data.appendUInt64(offset)
        data.appendLengthPrefixed(writeData)

        let response = try sendRequest(data)

        if response[0] == SftpPacketType.status.rawValue {
            let statusCode = response.count >= 9 ? response.readUInt32(at: 5) : 0
            if statusCode != SftpStatusCode.ok.rawValue {
                throw sftpError(from: response, fallback: "write failed")
            }
        }
    }

    private func closeHandle(handle: Data) throws {
        var data = Data()
        data.append(SftpPacketType.close.rawValue)
        data.appendUInt32(nextRequestId)
        data.appendLengthPrefixed(handle)

        _ = try sendRequest(data)
    }

    // MARK: - Response Parsing

    private func extractHandle(from response: Data) -> Data {
        guard response.count > 9 else { return Data() }
        let handleLen = response.readUInt32(at: 5)
        let start = 9
        let end = min(start + Int(handleLen), response.count)
        return Data(response[start ..< end])
    }

    private func parseNameResponse(_ response: Data) -> [[String: Any]] {
        guard response.count > 9 else { return [] }
        let count = response.readUInt32(at: 5)
        var offset = 9
        var results: [[String: Any]] = []

        for _ in 0 ..< count {
            guard offset + 4 <= response.count else { break }
            let nameLen = response.readUInt32(at: offset)
            offset += 4
            guard offset + Int(nameLen) <= response.count else { break }
            let name = String(data: response[offset ..< offset + Int(nameLen)], encoding: .utf8) ?? ""
            offset += Int(nameLen)

            // Long name
            guard offset + 4 <= response.count else { break }
            let longNameLen = response.readUInt32(at: offset)
            offset += 4
            offset += Int(longNameLen) // skip long name

            // Attrs
            guard offset + 4 <= response.count else { break }
            let attrFlags = response.readUInt32(at: offset)
            offset += 4

            var size: UInt64 = 0
            var permissions: UInt32 = 0
            var mtime: UInt32 = 0

            if attrFlags & 0x00000001 != 0 { // SSH_FILEXFER_ATTR_SIZE
                guard offset + 8 <= response.count else { break }
                size = response.readUInt64(at: offset)
                offset += 8
            }
            if attrFlags & 0x00000002 != 0 { // SSH_FILEXFER_ATTR_UIDGID
                offset += 8 // skip uid + gid
            }
            if attrFlags & 0x00000004 != 0 { // SSH_FILEXFER_ATTR_PERMISSIONS
                guard offset + 4 <= response.count else { break }
                permissions = response.readUInt32(at: offset)
                offset += 4
            }
            if attrFlags & 0x00000008 != 0 { // SSH_FILEXFER_ATTR_ACMODTIME
                guard offset + 8 <= response.count else { break }
                offset += 4 // skip atime
                mtime = response.readUInt32(at: offset)
                offset += 4
            }
            if attrFlags & 0x80000000 != 0 { // SSH_FILEXFER_ATTR_EXTENDED
                guard offset + 4 <= response.count else { break }
                let extCount = response.readUInt32(at: offset)
                offset += 4
                for _ in 0 ..< extCount {
                    guard offset + 4 <= response.count else { break }
                    let extNameLen = response.readUInt32(at: offset)
                    offset += 4 + Int(extNameLen)
                    guard offset + 4 <= response.count else { break }
                    let extValLen = response.readUInt32(at: offset)
                    offset += 4 + Int(extValLen)
                }
            }

            let isDirectory = (permissions & 0o40000) != 0
            let permString = String(format: "%o", permissions & 0o7777)
            let modDate = mtime > 0 ? Date(timeIntervalSince1970: TimeInterval(mtime)).description : ""

            results.append([
                "name": name,
                "path": name, // caller should prepend directory path
                "size": size,
                "isDirectory": isDirectory,
                "modifiedAt": modDate,
                "permissions": permString,
            ])
        }

        return results
    }

    private func sftpError(from response: Data, fallback: String) -> NSError {
        if response.count >= 13, response[0] == SftpPacketType.status.rawValue {
            let statusCode = response.readUInt32(at: 5)
            let msgLen = response.readUInt32(at: 9)
            let start = 13
            let end = min(start + Int(msgLen), response.count)
            let msg = String(data: response[start ..< end], encoding: .utf8) ?? fallback
            return NSError(domain: "SFTP", code: Int(statusCode), userInfo: [NSLocalizedDescriptionKey: msg])
        }
        return NSError(domain: "SFTP", code: -1, userInfo: [NSLocalizedDescriptionKey: fallback])
    }
}

// MARK: - Data Extension Helpers

private extension Data {
    mutating func appendUInt32(_ value: UInt32) {
        var v = value.bigEndian
        append(Data(bytes: &v, count: 4))
    }

    mutating func appendUInt64(_ value: UInt64) {
        var v = value.bigEndian
        append(Data(bytes: &v, count: 8))
    }

    mutating func appendString(_ string: String) {
        let bytes = Array(string.utf8)
        appendUInt32(UInt32(bytes.count))
        append(contentsOf: bytes)
    }

    mutating func appendLengthPrefixed(_ data: Data) {
        appendUInt32(UInt32(data.count))
        append(data)
    }

    func readUInt32(at offset: Int) -> UInt32 {
        guard offset + 4 <= count else { return 0 }
        return withUnsafeBytes { ptr -> UInt32 in
            ptr.load(fromByteOffset: offset, as: UInt32.self).bigEndian
        }
    }

    func readUInt64(at offset: Int) -> UInt64 {
        guard offset + 8 <= count else { return 0 }
        return withUnsafeBytes { ptr -> UInt64 in
            ptr.load(fromByteOffset: offset, as: UInt64.self).bigEndian
        }
    }
}
