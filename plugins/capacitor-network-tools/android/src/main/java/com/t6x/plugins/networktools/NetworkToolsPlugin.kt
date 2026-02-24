package com.t6x.plugins.networktools

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.*

@CapacitorPlugin(name = "NetworkTools")
class NetworkToolsPlugin : Plugin() {

    private val sshClient = SshClient()
    private val httpClient = HttpClient()
    private val tcpClient = TcpClient()
    private val udpClient = UdpClient()
    private val networkScanner = NetworkScanner()
    private val mdnsDiscovery = MdnsDiscovery()
    private val wakeOnLan = WakeOnLan()

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // === SSH ===

    @PluginMethod
    fun sshConnect(call: PluginCall) {
        val host = call.getString("host") ?: return call.reject("host is required")
        val port = call.getInt("port", 22) ?: 22
        val username = call.getString("username") ?: return call.reject("username is required")
        val password = call.getString("password")
        val privateKey = call.getString("privateKey")

        scope.launch {
            try {
                val sessionId = sshClient.connect(host, port, username, password, privateKey)
                val ret = JSObject().put("sessionId", sessionId)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("SSH connect failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun sshExec(call: PluginCall) {
        val sessionId = call.getString("sessionId") ?: return call.reject("sessionId is required")
        val command = call.getString("command") ?: return call.reject("command is required")
        val timeout = call.getInt("timeout", 30000) ?: 30000

        scope.launch {
            try {
                val result = sshClient.exec(sessionId, command, timeout.toLong())
                val ret = JSObject()
                    .put("stdout", result.stdout)
                    .put("stderr", result.stderr)
                    .put("exitCode", result.exitCode)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("SSH exec failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun sshDisconnect(call: PluginCall) {
        val sessionId = call.getString("sessionId") ?: return call.reject("sessionId is required")
        scope.launch {
            try {
                sshClient.disconnect(sessionId)
                call.resolve()
            } catch (e: Exception) {
                call.reject("SSH disconnect failed: ${e.message}", e)
            }
        }
    }

    // === SFTP ===

    @PluginMethod
    fun sftpList(call: PluginCall) {
        val sessionId = call.getString("sessionId") ?: return call.reject("sessionId is required")
        val path = call.getString("path") ?: return call.reject("path is required")

        scope.launch {
            try {
                val files = sshClient.sftpList(sessionId, path)
                val ret = JSObject().put("files", files)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("SFTP list failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun sftpDownload(call: PluginCall) {
        val sessionId = call.getString("sessionId") ?: return call.reject("sessionId is required")
        val remotePath = call.getString("remotePath") ?: return call.reject("remotePath is required")

        scope.launch {
            try {
                val data = sshClient.sftpDownload(sessionId, remotePath)
                val ret = JSObject().put("data", data)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("SFTP download failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun sftpUpload(call: PluginCall) {
        val sessionId = call.getString("sessionId") ?: return call.reject("sessionId is required")
        val remotePath = call.getString("remotePath") ?: return call.reject("remotePath is required")
        val data = call.getString("data") ?: return call.reject("data is required")

        scope.launch {
            try {
                sshClient.sftpUpload(sessionId, remotePath, data)
                call.resolve()
            } catch (e: Exception) {
                call.reject("SFTP upload failed: ${e.message}", e)
            }
        }
    }

    // === HTTP ===

    @PluginMethod
    fun httpRequest(call: PluginCall) {
        val url = call.getString("url") ?: return call.reject("url is required")
        val method = call.getString("method", "GET") ?: "GET"
        val headersObj = call.getObject("headers")
        val body = call.getString("body")
        val timeout = call.getInt("timeout", 30000) ?: 30000
        val insecure = call.getBoolean("insecure", false) ?: false

        val headers = mutableMapOf<String, String>()
        headersObj?.keys()?.forEach { key ->
            headers[key] = headersObj.getString(key) ?: ""
        }

        scope.launch {
            try {
                val result = httpClient.request(url, method, headers, body, timeout.toLong(), insecure)
                val responseHeaders = JSObject()
                result.headers.forEach { (k, v) -> responseHeaders.put(k, v) }

                val ret = JSObject()
                    .put("statusCode", result.statusCode)
                    .put("headers", responseHeaders)
                    .put("body", result.body)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("HTTP request failed: ${e.message}", e)
            }
        }
    }

    // === TCP ===

    @PluginMethod
    fun tcpConnect(call: PluginCall) {
        val host = call.getString("host") ?: return call.reject("host is required")
        val port = call.getInt("port") ?: return call.reject("port is required")
        val timeout = call.getInt("timeout", 10000) ?: 10000

        scope.launch {
            try {
                val socketId = tcpClient.connect(host, port, timeout)
                val ret = JSObject().put("socketId", socketId)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("TCP connect failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun tcpSend(call: PluginCall) {
        val socketId = call.getString("socketId") ?: return call.reject("socketId is required")
        val data = call.getString("data") ?: return call.reject("data is required")

        scope.launch {
            try {
                tcpClient.send(socketId, data)
                call.resolve()
            } catch (e: Exception) {
                call.reject("TCP send failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun tcpRead(call: PluginCall) {
        val socketId = call.getString("socketId") ?: return call.reject("socketId is required")
        val timeout = call.getInt("timeout", 10000) ?: 10000

        scope.launch {
            try {
                val data = tcpClient.read(socketId, timeout)
                val ret = JSObject().put("data", data)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("TCP read failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun tcpDisconnect(call: PluginCall) {
        val socketId = call.getString("socketId") ?: return call.reject("socketId is required")
        scope.launch {
            try {
                tcpClient.disconnect(socketId)
                call.resolve()
            } catch (e: Exception) {
                call.reject("TCP disconnect failed: ${e.message}", e)
            }
        }
    }

    // === UDP ===

    @PluginMethod
    fun udpSend(call: PluginCall) {
        val host = call.getString("host") ?: return call.reject("host is required")
        val port = call.getInt("port") ?: return call.reject("port is required")
        val data = call.getString("data") ?: return call.reject("data is required")

        scope.launch {
            try {
                udpClient.send(host, port, data)
                call.resolve()
            } catch (e: Exception) {
                call.reject("UDP send failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun udpBroadcast(call: PluginCall) {
        val port = call.getInt("port") ?: return call.reject("port is required")
        val data = call.getString("data") ?: return call.reject("data is required")

        scope.launch {
            try {
                udpClient.broadcast(port, data)
                call.resolve()
            } catch (e: Exception) {
                call.reject("UDP broadcast failed: ${e.message}", e)
            }
        }
    }

    // === Discovery ===

    @PluginMethod
    fun ping(call: PluginCall) {
        val host = call.getString("host") ?: return call.reject("host is required")
        val timeout = call.getInt("timeout", 5000) ?: 5000

        scope.launch {
            try {
                val result = networkScanner.ping(host, timeout)
                val ret = JSObject()
                    .put("reachable", result.reachable)
                    .put("latencyMs", result.latencyMs)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Ping failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun networkScan(call: PluginCall) {
        val subnet = call.getString("subnet") ?: return call.reject("subnet is required")
        val portsArray = call.getArray("ports")
        val timeout = call.getInt("timeout", 2000) ?: 2000

        val ports = if (portsArray != null) {
            (0 until portsArray.length()).map { portsArray.getInt(it) }
        } else {
            listOf(22, 80, 443, 631, 8080, 9100)
        }

        scope.launch {
            try {
                val hosts = networkScanner.scan(subnet, ports, timeout)
                val hostsArray = org.json.JSONArray()
                hosts.forEach { host ->
                    val hostObj = JSObject()
                        .put("ip", host.ip)
                        .put("hostname", host.hostname ?: "")
                        .put("openPorts", org.json.JSONArray(host.openPorts))
                        .put("latencyMs", host.latencyMs)
                    hostsArray.put(hostObj)
                }
                val ret = JSObject().put("hosts", hostsArray)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Network scan failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun mdnsDiscover(call: PluginCall) {
        val serviceType = call.getString("serviceType") ?: return call.reject("serviceType is required")
        val timeout = call.getInt("timeout", 5000) ?: 5000

        scope.launch {
            try {
                val context = activity ?: return@launch call.reject("No activity context")
                val services = mdnsDiscovery.discover(context, serviceType, timeout.toLong())
                val servicesArray = org.json.JSONArray()
                services.forEach { svc ->
                    val txtRecords = JSObject()
                    svc.txtRecords.forEach { (k, v) -> txtRecords.put(k, v) }

                    val svcObj = JSObject()
                        .put("name", svc.name)
                        .put("type", svc.type)
                        .put("host", svc.host)
                        .put("port", svc.port)
                        .put("addresses", org.json.JSONArray(svc.addresses))
                        .put("txtRecords", txtRecords)
                    servicesArray.put(svcObj)
                }
                val ret = JSObject().put("services", servicesArray)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("mDNS discover failed: ${e.message}", e)
            }
        }
    }

    // === Wake-on-LAN ===

    @PluginMethod
    fun wolSend(call: PluginCall) {
        val macAddress = call.getString("macAddress") ?: return call.reject("macAddress is required")
        val broadcastAddress = call.getString("broadcastAddress", "255.255.255.255") ?: "255.255.255.255"

        scope.launch {
            try {
                wakeOnLan.send(macAddress, broadcastAddress)
                call.resolve()
            } catch (e: Exception) {
                call.reject("WoL send failed: ${e.message}", e)
            }
        }
    }

    override fun handleOnDestroy() {
        scope.cancel()
        sshClient.disconnectAll()
        tcpClient.disconnectAll()
    }
}
