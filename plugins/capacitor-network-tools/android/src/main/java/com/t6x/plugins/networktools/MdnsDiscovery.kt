package com.t6x.plugins.networktools

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

data class MdnsServiceInfo(
    val name: String,
    val type: String,
    val host: String,
    val port: Int,
    val addresses: List<String>,
    val txtRecords: Map<String, String>
)

class MdnsDiscovery {

    suspend fun discover(context: Context, serviceType: String, timeout: Long): List<MdnsServiceInfo> {
        val nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
        val services = mutableListOf<MdnsServiceInfo>()
        val pendingResolves = mutableListOf<NsdServiceInfo>()

        // Discovery listener
        val discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(regType: String) {}
            override fun onDiscoveryStopped(serviceType: String) {}
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {}
            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {}

            override fun onServiceFound(service: NsdServiceInfo) {
                synchronized(pendingResolves) {
                    pendingResolves.add(service)
                }
            }

            override fun onServiceLost(service: NsdServiceInfo) {}
        }

        // Start discovery
        nsdManager.discoverServices(serviceType, NsdManager.PROTOCOL_DNS_SD, discoveryListener)

        // Wait for timeout to collect services
        delay(timeout)

        // Stop discovery
        try {
            nsdManager.stopServiceDiscovery(discoveryListener)
        } catch (_: Exception) {
            // Ignore if already stopped
        }

        // Resolve each discovered service
        val toResolve: List<NsdServiceInfo>
        synchronized(pendingResolves) {
            toResolve = pendingResolves.toList()
        }

        for (serviceInfo in toResolve) {
            val resolved = withTimeoutOrNull(3000L) {
                resolveService(nsdManager, serviceInfo)
            }
            if (resolved != null) {
                val txtRecords = mutableMapOf<String, String>()
                try {
                    resolved.attributes?.forEach { (key, value) ->
                        txtRecords[key] = value?.let { String(it) } ?: ""
                    }
                } catch (_: Exception) {}

                services.add(
                    MdnsServiceInfo(
                        name = resolved.serviceName ?: "",
                        type = resolved.serviceType ?: serviceType,
                        host = resolved.host?.hostAddress ?: "",
                        port = resolved.port,
                        addresses = listOfNotNull(resolved.host?.hostAddress),
                        txtRecords = txtRecords
                    )
                )
            }
        }

        return services
    }

    private suspend fun resolveService(nsdManager: NsdManager, serviceInfo: NsdServiceInfo): NsdServiceInfo? {
        return suspendCancellableCoroutine { cont ->
            nsdManager.resolveService(serviceInfo, object : NsdManager.ResolveListener {
                override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                    if (cont.isActive) cont.resume(null)
                }

                override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                    if (cont.isActive) cont.resume(serviceInfo)
                }
            })
        }
    }
}
