import Foundation
import Capacitor

@objc(NetworkToolsPlugin)
public class NetworkToolsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NetworkToolsPlugin"
    public let jsName = "NetworkTools"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sshConnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sshExec", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sshDisconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sftpList", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sftpDownload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sftpUpload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "httpRequest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "tcpConnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "tcpSend", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "tcpRead", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "tcpDisconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "udpSend", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "udpBroadcast", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ping", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "networkScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "mdnsDiscover", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "wolSend", returnType: CAPPluginReturnPromise),
    ]

    private let sshClient = SshClient()
    private let httpClient = HttpClientImpl()
    private let tcpClient = TcpClientImpl()
    private let udpClient = UdpClientImpl()
    private let networkScanner = NetworkScannerImpl()
    private let mdnsDiscovery = MdnsDiscoveryImpl()
    private let wakeOnLan = WakeOnLanImpl()

    private let queue = DispatchQueue(label: "com.t6x.networktools", qos: .userInitiated, attributes: .concurrent)

    // MARK: - SSH

    @objc func sshConnect(_ call: CAPPluginCall) {
        guard let host = call.getString("host") else { return call.reject("host is required") }
        guard let username = call.getString("username") else { return call.reject("username is required") }
        let port = call.getInt("port") ?? 22
        let password = call.getString("password")
        let privateKey = call.getString("privateKey")

        queue.async {
            do {
                let sessionId = try self.sshClient.connect(host: host, port: port, username: username, password: password, privateKey: privateKey)
                call.resolve(["sessionId": sessionId])
            } catch {
                call.reject("SSH connect failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func sshExec(_ call: CAPPluginCall) {
        guard let sessionId = call.getString("sessionId") else { return call.reject("sessionId is required") }
        guard let command = call.getString("command") else { return call.reject("command is required") }
        let timeout = call.getInt("timeout") ?? 30000

        queue.async {
            do {
                let result = try self.sshClient.exec(sessionId: sessionId, command: command, timeout: timeout)
                call.resolve([
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "exitCode": result.exitCode
                ])
            } catch {
                call.reject("SSH exec failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func sshDisconnect(_ call: CAPPluginCall) {
        guard let sessionId = call.getString("sessionId") else { return call.reject("sessionId is required") }
        queue.async {
            self.sshClient.disconnect(sessionId: sessionId)
            call.resolve()
        }
    }

    // MARK: - SFTP

    @objc func sftpList(_ call: CAPPluginCall) {
        guard let sessionId = call.getString("sessionId") else { return call.reject("sessionId is required") }
        guard let path = call.getString("path") else { return call.reject("path is required") }

        queue.async {
            do {
                let files = try self.sshClient.sftpList(sessionId: sessionId, path: path)
                call.resolve(["files": files])
            } catch {
                call.reject("SFTP list failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func sftpDownload(_ call: CAPPluginCall) {
        guard let sessionId = call.getString("sessionId") else { return call.reject("sessionId is required") }
        guard let remotePath = call.getString("remotePath") else { return call.reject("remotePath is required") }

        queue.async {
            do {
                let data = try self.sshClient.sftpDownload(sessionId: sessionId, remotePath: remotePath)
                call.resolve(["data": data])
            } catch {
                call.reject("SFTP download failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func sftpUpload(_ call: CAPPluginCall) {
        guard let sessionId = call.getString("sessionId") else { return call.reject("sessionId is required") }
        guard let remotePath = call.getString("remotePath") else { return call.reject("remotePath is required") }
        guard let data = call.getString("data") else { return call.reject("data is required") }

        queue.async {
            do {
                try self.sshClient.sftpUpload(sessionId: sessionId, remotePath: remotePath, base64Data: data)
                call.resolve()
            } catch {
                call.reject("SFTP upload failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - HTTP

    @objc func httpRequest(_ call: CAPPluginCall) {
        guard let url = call.getString("url") else { return call.reject("url is required") }
        let method = call.getString("method") ?? "GET"
        let headers = call.getObject("headers") as? [String: String] ?? [:]
        let body = call.getString("body")
        let timeout = call.getInt("timeout") ?? 30000
        let insecure = call.getBool("insecure") ?? false

        queue.async {
            self.httpClient.request(url: url, method: method, headers: headers, body: body, timeout: timeout, insecure: insecure) { result in
                switch result {
                case .success(let response):
                    call.resolve([
                        "statusCode": response.statusCode,
                        "headers": response.headers,
                        "body": response.body
                    ])
                case .failure(let error):
                    call.reject("HTTP request failed: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - TCP

    @objc func tcpConnect(_ call: CAPPluginCall) {
        guard let host = call.getString("host") else { return call.reject("host is required") }
        guard let port = call.getInt("port") else { return call.reject("port is required") }
        let timeout = call.getInt("timeout") ?? 10000

        queue.async {
            do {
                let socketId = try self.tcpClient.connect(host: host, port: port, timeout: timeout)
                call.resolve(["socketId": socketId])
            } catch {
                call.reject("TCP connect failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func tcpSend(_ call: CAPPluginCall) {
        guard let socketId = call.getString("socketId") else { return call.reject("socketId is required") }
        guard let data = call.getString("data") else { return call.reject("data is required") }

        queue.async {
            do {
                try self.tcpClient.send(socketId: socketId, base64Data: data)
                call.resolve()
            } catch {
                call.reject("TCP send failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func tcpRead(_ call: CAPPluginCall) {
        guard let socketId = call.getString("socketId") else { return call.reject("socketId is required") }
        let timeout = call.getInt("timeout") ?? 10000

        queue.async {
            do {
                let data = try self.tcpClient.read(socketId: socketId, timeout: timeout)
                call.resolve(["data": data])
            } catch {
                call.reject("TCP read failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func tcpDisconnect(_ call: CAPPluginCall) {
        guard let socketId = call.getString("socketId") else { return call.reject("socketId is required") }
        queue.async {
            self.tcpClient.disconnect(socketId: socketId)
            call.resolve()
        }
    }

    // MARK: - UDP

    @objc func udpSend(_ call: CAPPluginCall) {
        guard let host = call.getString("host") else { return call.reject("host is required") }
        guard let port = call.getInt("port") else { return call.reject("port is required") }
        guard let data = call.getString("data") else { return call.reject("data is required") }

        queue.async {
            do {
                try self.udpClient.send(host: host, port: port, base64Data: data)
                call.resolve()
            } catch {
                call.reject("UDP send failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func udpBroadcast(_ call: CAPPluginCall) {
        guard let port = call.getInt("port") else { return call.reject("port is required") }
        guard let data = call.getString("data") else { return call.reject("data is required") }

        queue.async {
            do {
                try self.udpClient.broadcast(port: port, base64Data: data)
                call.resolve()
            } catch {
                call.reject("UDP broadcast failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Discovery

    @objc func ping(_ call: CAPPluginCall) {
        guard let host = call.getString("host") else { return call.reject("host is required") }
        let timeout = call.getInt("timeout") ?? 5000

        queue.async {
            self.networkScanner.ping(host: host, timeout: timeout) { result in
                call.resolve([
                    "reachable": result.reachable,
                    "latencyMs": result.latencyMs
                ])
            }
        }
    }

    @objc func networkScan(_ call: CAPPluginCall) {
        guard let subnet = call.getString("subnet") else { return call.reject("subnet is required") }
        let ports = (call.getArray("ports") as? [Int]) ?? [22, 80, 443, 631, 8080, 9100]
        let timeout = call.getInt("timeout") ?? 2000

        queue.async {
            self.networkScanner.scan(subnet: subnet, ports: ports, timeout: timeout) { hosts in
                let hostsArray = hosts.map { host -> [String: Any] in
                    return [
                        "ip": host.ip,
                        "hostname": host.hostname ?? "",
                        "openPorts": host.openPorts,
                        "latencyMs": host.latencyMs
                    ]
                }
                call.resolve(["hosts": hostsArray])
            }
        }
    }

    @objc func mdnsDiscover(_ call: CAPPluginCall) {
        guard let serviceType = call.getString("serviceType") else { return call.reject("serviceType is required") }
        let timeout = call.getInt("timeout") ?? 5000

        queue.async {
            self.mdnsDiscovery.discover(serviceType: serviceType, timeout: timeout) { services in
                let servicesArray = services.map { svc -> [String: Any] in
                    return [
                        "name": svc.name,
                        "type": svc.type,
                        "host": svc.host,
                        "port": svc.port,
                        "addresses": svc.addresses,
                        "txtRecords": svc.txtRecords
                    ]
                }
                call.resolve(["services": servicesArray])
            }
        }
    }

    // MARK: - Wake-on-LAN

    @objc func wolSend(_ call: CAPPluginCall) {
        guard let macAddress = call.getString("macAddress") else { return call.reject("macAddress is required") }
        let broadcastAddress = call.getString("broadcastAddress") ?? "255.255.255.255"

        queue.async {
            do {
                try self.wakeOnLan.send(macAddress: macAddress, broadcastAddress: broadcastAddress)
                call.resolve()
            } catch {
                call.reject("WoL send failed: \(error.localizedDescription)")
            }
        }
    }
}
