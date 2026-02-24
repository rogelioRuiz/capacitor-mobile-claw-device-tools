import Foundation

struct MdnsServiceDetail {
    let name: String
    let type: String
    let host: String
    let port: Int
    let addresses: [String]
    let txtRecords: [String: String]
}

class MdnsDiscoveryImpl: NSObject, NetServiceBrowserDelegate, NetServiceDelegate {
    private var browser: NetServiceBrowser?
    private var discoveredServices: [NetService] = []
    private var resolvedServices: [MdnsServiceDetail] = []
    private var completion: (([MdnsServiceDetail]) -> Void)?
    private var pendingResolves = 0
    private let lock = NSLock()

    func discover(serviceType: String, timeout: Int, completion: @escaping ([MdnsServiceDetail]) -> Void) {
        self.completion = completion
        self.discoveredServices = []
        self.resolvedServices = []

        browser = NetServiceBrowser()
        browser?.delegate = self

        // NetServiceBrowser expects format like "_http._tcp."
        let type = serviceType.hasSuffix(".") ? serviceType : serviceType + "."
        browser?.searchForServices(ofType: type, inDomain: "local.")

        // Stop after timeout
        DispatchQueue.global().asyncAfter(deadline: .now() + .milliseconds(timeout)) { [weak self] in
            self?.finishDiscovery()
        }
    }

    // MARK: - NetServiceBrowserDelegate

    func netServiceBrowser(_ browser: NetServiceBrowser, didFind service: NetService, moreComing: Bool) {
        lock.lock()
        discoveredServices.append(service)
        lock.unlock()

        // Resolve the service to get host/port/txt
        service.delegate = self
        service.resolve(withTimeout: 3.0)

        lock.lock()
        pendingResolves += 1
        lock.unlock()
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String: NSNumber]) {
        finishDiscovery()
    }

    // MARK: - NetServiceDelegate

    func netServiceDidResolveAddress(_ sender: NetService) {
        var addresses: [String] = []
        if let addressData = sender.addresses {
            for data in addressData {
                data.withUnsafeBytes { ptr in
                    let sockaddr = ptr.load(as: sockaddr.self)
                    if sockaddr.sa_family == UInt8(AF_INET) {
                        let sockaddr_in = ptr.load(as: sockaddr_in.self)
                        var addr = sockaddr_in.sin_addr
                        var buffer = [CChar](repeating: 0, count: Int(INET_ADDRSTRLEN))
                        inet_ntop(AF_INET, &addr, &buffer, socklen_t(INET_ADDRSTRLEN))
                        addresses.append(String(cString: buffer))
                    }
                }
            }
        }

        var txtRecords: [String: String] = [:]
        if let txtData = sender.txtRecordData() {
            let dict = NetService.dictionary(fromTXTRecord: txtData)
            for (key, value) in dict {
                txtRecords[key] = String(data: value, encoding: .utf8) ?? ""
            }
        }

        let detail = MdnsServiceDetail(
            name: sender.name,
            type: sender.type,
            host: sender.hostName ?? addresses.first ?? "",
            port: sender.port,
            addresses: addresses,
            txtRecords: txtRecords
        )

        lock.lock()
        resolvedServices.append(detail)
        pendingResolves -= 1
        lock.unlock()
    }

    func netService(_ sender: NetService, didNotResolve errorDict: [String: NSNumber]) {
        lock.lock()
        pendingResolves -= 1
        lock.unlock()
    }

    private func finishDiscovery() {
        browser?.stop()
        browser = nil

        // Wait briefly for pending resolves
        DispatchQueue.global().asyncAfter(deadline: .now() + 0.5) { [weak self] in
            guard let self = self else { return }
            self.lock.lock()
            let services = self.resolvedServices
            self.lock.unlock()
            self.completion?(services)
            self.completion = nil
        }
    }
}
