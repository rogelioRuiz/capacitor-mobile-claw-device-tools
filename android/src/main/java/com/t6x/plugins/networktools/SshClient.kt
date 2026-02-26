package com.t6x.plugins.networktools

import com.jcraft.jsch.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.UUID
import java.util.Vector
import java.util.concurrent.ConcurrentHashMap

data class ExecResult(val stdout: String, val stderr: String, val exitCode: Int)

class SshClient(private val registry: SessionRegistry) {

    private val sessions = ConcurrentHashMap<String, Session>()

    fun connect(
        host: String,
        port: Int,
        username: String,
        password: String?,
        privateKey: String?
    ): String {
        val session = createJschSession(host, port, username, password, privateKey)
        val sessionId = UUID.randomUUID().toString()
        sessions[sessionId] = session
        registry.register(
            sessionId, mapOf(
                "host" to host,
                "port" to port,
                "username" to username,
                "password" to password,
                "privateKey" to privateKey
            )
        )
        return sessionId
    }

    fun exec(sessionId: String, command: String, timeout: Long): ExecResult {
        val session = sessions[sessionId] ?: reconnect(sessionId)
        registry.touch(sessionId)

        val channel = session.openChannel("exec") as ChannelExec
        channel.setCommand(command)

        val stdout = ByteArrayOutputStream()
        val stderr = ByteArrayOutputStream()
        channel.outputStream = stdout
        channel.setErrStream(stderr)

        channel.connect(timeout.toInt())

        val startTime = System.currentTimeMillis()
        while (!channel.isClosed) {
            if (System.currentTimeMillis() - startTime > timeout) {
                channel.disconnect()
                throw RuntimeException("Command timed out after ${timeout}ms")
            }
            Thread.sleep(100)
        }

        val exitCode = channel.exitStatus
        channel.disconnect()

        return ExecResult(
            stdout = stdout.toString("UTF-8"),
            stderr = stderr.toString("UTF-8"),
            exitCode = exitCode
        )
    }

    fun disconnect(sessionId: String) {
        val session = sessions.remove(sessionId)
        session?.disconnect()
        registry.evict(sessionId)
    }

    fun disconnectAll() {
        sessions.values.forEach { it.disconnect() }
        sessions.clear()
        registry.evictAll()
    }

    // === SFTP ===

    fun sftpList(sessionId: String, path: String): JSONArray {
        val session = sessions[sessionId] ?: reconnect(sessionId)
        registry.touch(sessionId)

        val channel = session.openChannel("sftp") as ChannelSftp
        channel.connect()

        try {
            @Suppress("UNCHECKED_CAST")
            val entries = channel.ls(path) as Vector<*>

            val files = JSONArray()
            for (item in entries) {
                val entry = item as ChannelSftp.LsEntry
                val name = entry.filename
                if (name == "." || name == "..") continue
                val a = entry.attrs
                val fileObj = JSONObject()
                    .put("name", name)
                    .put("path", "$path/$name")
                    .put("size", a.size)
                    .put("isDirectory", a.isDir)
                    .put("modifiedAt", java.time.Instant.ofEpochSecond(a.mTime.toLong()).toString())
                    .put("permissions", a.permissionsString)
                files.put(fileObj)
            }
            return files
        } finally {
            channel.disconnect()
        }
    }

    fun sftpDownload(sessionId: String, remotePath: String): String {
        val session = sessions[sessionId] ?: reconnect(sessionId)
        registry.touch(sessionId)

        val channel = session.openChannel("sftp") as ChannelSftp
        channel.connect()

        try {
            val output = ByteArrayOutputStream()
            channel.get(remotePath, output)
            return android.util.Base64.encodeToString(output.toByteArray(), android.util.Base64.NO_WRAP)
        } finally {
            channel.disconnect()
        }
    }

    fun sftpUpload(sessionId: String, remotePath: String, base64Data: String) {
        val session = sessions[sessionId] ?: reconnect(sessionId)
        registry.touch(sessionId)

        val channel = session.openChannel("sftp") as ChannelSftp
        channel.connect()

        try {
            val data = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT)
            channel.put(ByteArrayInputStream(data), remotePath)
        } finally {
            channel.disconnect()
        }
    }

    // === Private ===

    private fun createJschSession(
        host: String,
        port: Int,
        username: String,
        password: String?,
        privateKey: String?
    ): Session {
        val jsch = JSch()

        if (!privateKey.isNullOrBlank()) {
            jsch.addIdentity("key", privateKey.toByteArray(), null, null)
        }

        val session = jsch.getSession(username, host, port)

        if (!password.isNullOrBlank()) {
            session.setPassword(password)
        }

        val config = java.util.Properties()
        config["StrictHostKeyChecking"] = "no"
        session.setConfig(config)

        session.timeout = 15000
        session.setServerAliveInterval(30000)
        session.setServerAliveCountMax(3)
        session.connect()

        return session
    }

    private fun reconnect(sessionId: String): Session {
        val params = registry.getParams(sessionId)
            ?: throw IllegalArgumentException("SSH session expired or unknown: $sessionId")

        val host = params["host"] as? String ?: throw IllegalArgumentException("Stored params missing host")
        val port = (params["port"] as? Int) ?: 22
        val username = params["username"] as? String ?: throw IllegalArgumentException("Stored params missing username")
        val password = params["password"] as? String
        val privateKey = params["privateKey"] as? String

        val session = createJschSession(host, port, username, password, privateKey)
        sessions[sessionId] = session
        return session
    }
}
