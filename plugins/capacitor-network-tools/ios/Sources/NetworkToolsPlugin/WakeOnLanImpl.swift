import Foundation

class WakeOnLanImpl {

    func send(macAddress: String, broadcastAddress: String) throws {
        // Parse MAC address
        let cleanMac = macAddress.replacingOccurrences(of: ":", with: "").replacingOccurrences(of: "-", with: "")
        guard cleanMac.count == 12 else {
            throw NSError(domain: "WOL", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid MAC address: \(macAddress)"])
        }

        var macBytes: [UInt8] = []
        var index = cleanMac.startIndex
        for _ in 0..<6 {
            let nextIndex = cleanMac.index(index, offsetBy: 2)
            let byteStr = String(cleanMac[index..<nextIndex])
            guard let byte = UInt8(byteStr, radix: 16) else {
                throw NSError(domain: "WOL", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid MAC address: \(macAddress)"])
            }
            macBytes.append(byte)
            index = nextIndex
        }

        // Build magic packet: 6x 0xFF + 16x MAC
        var magicPacket: [UInt8] = Array(repeating: 0xFF, count: 6)
        for _ in 0..<16 {
            magicPacket.append(contentsOf: macBytes)
        }

        // Send via POSIX UDP socket
        let sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP)
        guard sock >= 0 else {
            throw NSError(domain: "WOL", code: -2, userInfo: [NSLocalizedDescriptionKey: "Failed to create socket"])
        }
        defer { close(sock) }

        var broadcastEnable: Int32 = 1
        setsockopt(sock, SOL_SOCKET, SO_BROADCAST, &broadcastEnable, socklen_t(MemoryLayout<Int32>.size))

        var addr = sockaddr_in()
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = UInt16(9).bigEndian // WoL port 9
        addr.sin_addr.s_addr = inet_addr(broadcastAddress)

        let sent = magicPacket.withUnsafeBytes { buffer -> Int in
            withUnsafePointer(to: &addr) { addrPtr in
                addrPtr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPtr in
                    sendto(sock, buffer.baseAddress, magicPacket.count, 0, sockaddrPtr, socklen_t(MemoryLayout<sockaddr_in>.size))
                }
            }
        }

        if sent < 0 {
            throw NSError(domain: "WOL", code: -3, userInfo: [NSLocalizedDescriptionKey: "WoL send failed (errno: \(errno))"])
        }
    }
}
