import Foundation

struct HttpResponse {
    let statusCode: Int
    let headers: [String: String]
    let body: String
}

class HttpClientImpl: NSObject, URLSessionDelegate {

    func request(
        url: String,
        method: String,
        headers: [String: String],
        body: String?,
        timeout: Int,
        insecure: Bool,
        completion: @escaping (Result<HttpResponse, Error>) -> Void
    ) {
        guard let url = URL(string: url) else {
            completion(.failure(NSError(domain: "HTTP", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.uppercased()
        request.timeoutInterval = TimeInterval(timeout) / 1000.0

        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }

        if let body = body {
            request.httpBody = body.data(using: .utf8)
        }

        // Create session — optionally skip TLS verification
        let session: URLSession
        if insecure {
            let config = URLSessionConfiguration.default
            config.timeoutIntervalForRequest = TimeInterval(timeout) / 1000.0
            session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
        } else {
            session = URLSession.shared
        }

        let task = session.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(NSError(domain: "HTTP", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid response"])))
                return
            }

            var responseHeaders: [String: String] = [:]
            for (key, value) in httpResponse.allHeaderFields {
                responseHeaders[String(describing: key)] = String(describing: value)
            }

            let bodyString = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""

            completion(.success(HttpResponse(
                statusCode: httpResponse.statusCode,
                headers: responseHeaders,
                body: bodyString
            )))
        }
        task.resume()
    }

    // URLSessionDelegate — allow self-signed certs when insecure=true
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
           let serverTrust = challenge.protectionSpace.serverTrust {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
        } else {
            completionHandler(.performDefaultHandling, nil)
        }
    }
}
