package com.t6x.plugins.networktools

import android.util.Base64
import java.io.InputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class TcpClient {

    private data class TcpSession(
        val socket: Socket,
        val input: InputStream,
        val output: OutputStream
    )

    private val sockets = ConcurrentHashMap<String, TcpSession>()

    fun connect(host: String, port: Int, timeout: Int): String {
        val socket = Socket()
        socket.connect(InetSocketAddress(host, port), timeout)
        socket.soTimeout = timeout

        val socketId = UUID.randomUUID().toString()
        sockets[socketId] = TcpSession(socket, socket.getInputStream(), socket.getOutputStream())
        return socketId
    }

    fun send(socketId: String, base64Data: String) {
        val session = sockets[socketId] ?: throw IllegalArgumentException("Invalid socket ID: $socketId")
        val data = Base64.decode(base64Data, Base64.DEFAULT)
        session.output.write(data)
        session.output.flush()
    }

    fun read(socketId: String, timeout: Int): String {
        val session = sockets[socketId] ?: throw IllegalArgumentException("Invalid socket ID: $socketId")
        session.socket.soTimeout = timeout

        val buffer = ByteArray(65536)
        val bytesRead = session.input.read(buffer)

        return if (bytesRead > 0) {
            Base64.encodeToString(buffer.copyOf(bytesRead), Base64.NO_WRAP)
        } else {
            ""
        }
    }

    fun disconnect(socketId: String) {
        val session = sockets.remove(socketId)
        session?.socket?.close()
    }

    fun disconnectAll() {
        sockets.values.forEach { it.socket.close() }
        sockets.clear()
    }
}
