package com.t6x.plugins.networktools

import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

class WakeOnLan {

    fun send(macAddress: String, broadcastAddress: String) {
        // Parse MAC address (supports AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF)
        val macBytes = macAddress
            .replace(":", "")
            .replace("-", "")
            .chunked(2)
            .map { it.toInt(16).toByte() }
            .toByteArray()

        if (macBytes.size != 6) {
            throw IllegalArgumentException("Invalid MAC address: $macAddress")
        }

        // Build magic packet: 6 bytes of 0xFF followed by MAC address repeated 16 times
        val magicPacket = ByteArray(6 + 16 * 6)

        // First 6 bytes = 0xFF
        for (i in 0..5) {
            magicPacket[i] = 0xFF.toByte()
        }

        // Repeat MAC address 16 times
        for (i in 0..15) {
            System.arraycopy(macBytes, 0, magicPacket, 6 + i * 6, 6)
        }

        // Send UDP broadcast
        val address = InetAddress.getByName(broadcastAddress)
        val packet = DatagramPacket(magicPacket, magicPacket.size, address, 9) // Port 9 is standard WoL

        DatagramSocket().use { socket ->
            socket.broadcast = true
            socket.send(packet)
        }
    }
}
