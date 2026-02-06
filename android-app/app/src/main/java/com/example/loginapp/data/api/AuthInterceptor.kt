package com.example.loginapp.data.api

import com.example.loginapp.data.repository.AuthRepository
import com.example.loginapp.data.repository.DeviceRepository
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(
    private val authRepository: AuthRepository,
    private val deviceRepository: DeviceRepository,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val token = authRepository.getToken()
        val deviceId = deviceRepository.getDeviceIdBlocking()
        val builder = request.newBuilder()
            .addHeader("X-Device-Id", deviceId)
        if (!token.isNullOrBlank()) {
            builder.addHeader("Authorization", "Bearer $token")
        }
        val newRequest = builder.build()
        return chain.proceed(newRequest)
    }
}
