package com.t6x.plugins.networktools

import android.util.Base64
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

class UdpClient {

    fun send(host: String, port: Int, base64Data: String) {
        val data = Base64.decode(base64Data, Base64.DEFAULT)
        val address = InetAddress.getByName(host)
        val packet = DatagramPacket(data, data.size, address, port)

        DatagramSocket().use { socket ->
            socket.send(packet)
        }
    }

    fun broadcast(port: Int, base64Data: String) {
        val data = Base64.decode(base64Data, Base64.DEFAULT)
        val broadcastAddress = InetAddress.getByName("255.255.255.255")
        val packet = DatagramPacket(data, data.size, broadcastAddress, port)

        DatagramSocket().use { socket ->
            socket.broadcast = true
            socket.send(packet)
        }
    }
}
