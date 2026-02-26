import Foundation
import Security

/**
 * Manages stateful session lifecycles with vaulted credential storage and TTL-based eviction.
 *
 * Credentials are stored in the iOS Keychain (kSecAttrAccessibleWhenUnlocked).
 * An in-memory index tracks last-used timestamps for TTL enforcement without loading
 * sensitive data into plain Swift structures unnecessarily.
 *
 * Generic by design — reusable for SSH, TCP, WebSocket, or any stateful connection.
 */
class SessionRegistry {
    private let namespace: String
    private let ttlSeconds: TimeInterval
    private var lastUsed: [String: Date] = [:]
    private let lock = NSLock()

    private let keychainService = "com.t6x.networktools.session_registry"

    init(namespace: String, ttlSeconds: TimeInterval = 900) {
        self.namespace = namespace
        self.ttlSeconds = ttlSeconds
    }

    // MARK: - Public API

    /** Vault the connection params for sessionId and record its last-used time. */
    func register(sessionId: String, params: [String: Any?]) {
        evictExpired()
        let filtered = params.compactMapValues { $0 }
        guard let data = try? JSONSerialization.data(withJSONObject: filtered) else { return }
        saveToKeychain(key: keychainKey(sessionId), data: data)
        lock.lock()
        lastUsed[sessionId] = Date()
        lock.unlock()
    }

    /**
     * Retrieve vaulted params for sessionId.
     * Returns nil if the session is unknown or has exceeded the TTL.
     */
    func getParams(sessionId: String) -> [String: Any]? {
        evictExpired()
        lock.lock()
        let last = lastUsed[sessionId]
        lock.unlock()
        guard let last = last else { return nil }
        guard Date().timeIntervalSince(last) < ttlSeconds else {
            evict(sessionId)
            return nil
        }
        guard let data = loadFromKeychain(key: keychainKey(sessionId)),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        touch(sessionId)
        return obj
    }

    /** Refresh the last-used timestamp, resetting the TTL countdown. */
    func touch(_ sessionId: String) {
        lock.lock()
        if lastUsed[sessionId] != nil {
            lastUsed[sessionId] = Date()
        }
        lock.unlock()
    }

    /** Remove sessionId from the vault and index immediately. */
    func evict(_ sessionId: String) {
        lock.lock()
        lastUsed.removeValue(forKey: sessionId)
        lock.unlock()
        deleteFromKeychain(key: keychainKey(sessionId))
    }

    /** Remove all sessions whose last-used time exceeds the TTL. */
    func evictExpired() {
        lock.lock()
        let expired = lastUsed.filter { Date().timeIntervalSince($0.value) >= ttlSeconds }.map { $0.key }
        lock.unlock()
        expired.forEach { evict($0) }
    }

    /** Remove all sessions from the vault and index. */
    func evictAll() {
        lock.lock()
        let all = Array(lastUsed.keys)
        lock.unlock()
        all.forEach { evict($0) }
    }

    // MARK: - Private

    private func keychainKey(_ sessionId: String) -> String {
        return "\(namespace).\(sessionId)"
    }

    private func baseQuery(key: String) -> [String: Any] {
        return [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
        ]
    }

    private func saveToKeychain(key: String, data: Data) {
        var query = baseQuery(key: key)
        SecItemDelete(query as CFDictionary)
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlocked
        SecItemAdd(query as CFDictionary, nil)
    }

    private func loadFromKeychain(key: String) -> Data? {
        var query = baseQuery(key: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        return status == errSecSuccess ? result as? Data : nil
    }

    private func deleteFromKeychain(key: String) {
        SecItemDelete(baseQuery(key: key) as CFDictionary)
    }
}
