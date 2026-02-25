package com.t6x.plugins.networktools

import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import kotlinx.coroutines.*

data class PingResult(val reachable: Boolean, val latencyMs: Long)

data class DiscoveredHost(
    val ip: String,
    val hostname: String?,
    val openPorts: List<Int>,
    val latencyMs: Long
)

class NetworkScanner {

    fun ping(host: String, timeout: Int): PingResult {
        val startTime = System.currentTimeMillis()
        val address = InetAddress.getByName(host)
        val reachable = address.isReachable(timeout)
        val latency = System.currentTimeMillis() - startTime

        return PingResult(reachable = reachable, latencyMs = latency)
    }

    suspend fun scan(subnet: String, ports: List<Int>, timeout: Int): List<DiscoveredHost> {
        // Parse CIDR notation (e.g., "192.168.1.0/24")
        val parts = subnet.split("/")
        val baseIp = parts[0]
        val prefixLength = if (parts.size > 1) parts[1].toInt() else 24

        val ipParts = baseIp.split(".").map { it.toInt() }
        val baseAddress = (ipParts[0] shl 24) or (ipParts[1] shl 16) or (ipParts[2] shl 8) or ipParts[3]
        val hostBits = 32 - prefixLength
        val numHosts = (1 shl hostBits) - 2 // Exclude network and broadcast addresses

        val hosts = mutableListOf<DiscoveredHost>()

        // Scan hosts in parallel with limited concurrency
        coroutineScope {
            val semaphore = kotlinx.coroutines.sync.Semaphore(50) // Max 50 concurrent scans
            val deferreds = (1..numHosts).map { i ->
                async {
                    semaphore.acquire()
                    try {
                        val addr = baseAddress + i
                        val ip = "${(addr shr 24) and 0xFF}.${(addr shr 16) and 0xFF}.${(addr shr 8) and 0xFF}.${addr and 0xFF}"

                        val startTime = System.currentTimeMillis()
                        val address = InetAddress.getByName(ip)
                        val reachable = address.isReachable(timeout)

                        if (!reachable) return@async null

                        val latency = System.currentTimeMillis() - startTime
                        val hostname = try { address.canonicalHostName.takeIf { it != ip } } catch (_: Exception) { null }

                        // Port scan
                        val openPorts = ports.filter { port ->
                            try {
                                Socket().use { socket ->
                                    socket.connect(InetSocketAddress(ip, port), timeout)
                                    true
                                }
                            } catch (_: Exception) {
                                false
                            }
                        }

                        DiscoveredHost(
                            ip = ip,
                            hostname = hostname,
                            openPorts = openPorts,
                            latencyMs = latency
                        )
                    } finally {
                        semaphore.release()
                    }
                }
            }

            deferreds.forEach { deferred ->
                deferred.await()?.let { hosts.add(it) }
            }
        }

        return hosts.sortedBy { it.ip }
    }
}
