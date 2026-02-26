package com.t6x.plugins.networktools

import android.content.Context
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

/**
 * Manages stateful session lifecycles with vaulted credential storage and TTL-based eviction.
 *
 * Credentials are stored in EncryptedSharedPreferences (AndroidKeyStore-backed AES-256-GCM).
 * An in-memory index tracks last-used timestamps for TTL enforcement without storing
 * sensitive data in plain memory structures.
 *
 * Generic by design — reusable for SSH, TCP, WebSocket, or any stateful connection.
 */
class SessionRegistry(
    context: Context,
    private val namespace: String,
    private val ttlMs: Long = 15 * 60 * 1000L
) {
    private val tag = "SessionRegistry[$namespace]"
    private val lastUsed = ConcurrentHashMap<String, Long>()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "session_registry_$namespace",
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    /** Vault the connection params for [sessionId] and record its last-used time. */
    fun register(sessionId: String, params: Map<String, Any?>) {
        evictExpired()
        val filtered = params.filterValues { it != null }
        val json = JSONObject(filtered as Map<*, *>).toString()
        prefs.edit().putString("session_$sessionId", json).apply()
        lastUsed[sessionId] = System.currentTimeMillis()
        Log.d(tag, "Registered session $sessionId")
    }

    /**
     * Retrieve vaulted params for [sessionId].
     * Returns null if the session is unknown or has exceeded the TTL.
     */
    fun getParams(sessionId: String): Map<String, Any?>? {
        evictExpired()
        val last = lastUsed[sessionId] ?: return null
        if (System.currentTimeMillis() - last > ttlMs) {
            Log.d(tag, "Session $sessionId TTL expired")
            evict(sessionId)
            return null
        }
        val json = prefs.getString("session_$sessionId", null) ?: return null
        return try {
            val obj = JSONObject(json)
            obj.keys().asSequence().associateWith { key ->
                val v = obj.get(key)
                if (v == JSONObject.NULL) null else v
            }
        } catch (e: Exception) {
            Log.w(tag, "Failed to parse params for $sessionId: ${e.message}")
            null
        }
    }

    /** Refresh the last-used timestamp, resetting the TTL countdown. */
    fun touch(sessionId: String) {
        if (lastUsed.containsKey(sessionId)) {
            lastUsed[sessionId] = System.currentTimeMillis()
        }
    }

    /** Remove [sessionId] from the vault and index immediately. */
    fun evict(sessionId: String) {
        lastUsed.remove(sessionId)
        prefs.edit().remove("session_$sessionId").apply()
        Log.d(tag, "Evicted session $sessionId")
    }

    /** Remove all sessions whose last-used time exceeds the TTL. */
    fun evictExpired() {
        val now = System.currentTimeMillis()
        val expired = lastUsed.entries
            .filter { now - it.value > ttlMs }
            .map { it.key }
        expired.forEach { id ->
            lastUsed.remove(id)
            prefs.edit().remove("session_$id").apply()
            Log.d(tag, "TTL-evicted session $id")
        }
    }

    /** Remove all sessions from the vault and index. */
    fun evictAll() {
        val all = lastUsed.keys.toList()
        all.forEach { evict(it) }
    }
}
