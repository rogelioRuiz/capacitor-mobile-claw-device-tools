package com.t6x.plugins.networktools

import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.*

data class HttpResult(
    val statusCode: Int,
    val headers: Map<String, String>,
    val body: String
)

class HttpClient {

    fun request(
        url: String,
        method: String,
        headers: Map<String, String>,
        body: String?,
        timeout: Long,
        insecure: Boolean
    ): HttpResult {
        val clientBuilder = OkHttpClient.Builder()
            .connectTimeout(timeout, TimeUnit.MILLISECONDS)
            .readTimeout(timeout, TimeUnit.MILLISECONDS)
            .writeTimeout(timeout, TimeUnit.MILLISECONDS)
            .followRedirects(true)
            .followSslRedirects(true)

        // Skip TLS verification for self-signed certs (common on IoT devices)
        if (insecure) {
            val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
                override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
                override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
                override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
            })
            val sslContext = SSLContext.getInstance("TLS")
            sslContext.init(null, trustAllCerts, SecureRandom())
            clientBuilder.sslSocketFactory(sslContext.socketFactory, trustAllCerts[0] as X509TrustManager)
            clientBuilder.hostnameVerifier { _, _ -> true }
        }

        val client = clientBuilder.build()

        val requestBuilder = Request.Builder().url(url)

        // Add headers
        headers.forEach { (key, value) ->
            requestBuilder.addHeader(key, value)
        }

        // Set method and body
        val requestBody = if (body != null && method.uppercase() in listOf("POST", "PUT", "PATCH")) {
            val contentType = headers["Content-Type"] ?: headers["content-type"] ?: "application/json"
            body.toRequestBody(contentType.toMediaTypeOrNull())
        } else {
            null
        }

        when (method.uppercase()) {
            "GET" -> requestBuilder.get()
            "HEAD" -> requestBuilder.head()
            "DELETE" -> requestBuilder.delete(requestBody)
            "POST" -> requestBuilder.post(requestBody ?: "".toRequestBody(null))
            "PUT" -> requestBuilder.put(requestBody ?: "".toRequestBody(null))
            "PATCH" -> requestBuilder.patch(requestBody ?: "".toRequestBody(null))
            "OPTIONS" -> requestBuilder.method("OPTIONS", requestBody)
            else -> requestBuilder.method(method.uppercase(), requestBody)
        }

        val response = client.newCall(requestBuilder.build()).execute()

        val responseHeaders = mutableMapOf<String, String>()
        response.headers.forEach { (name, value) ->
            responseHeaders[name] = value
        }

        val responseBody = response.body?.string() ?: ""

        return HttpResult(
            statusCode = response.code,
            headers = responseHeaders,
            body = responseBody
        )
    }
}
