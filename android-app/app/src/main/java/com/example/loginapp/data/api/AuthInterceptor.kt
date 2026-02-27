package com.example.loginapp.data.api

import com.example.loginapp.data.model.RefreshRequest
import com.example.loginapp.data.model.RefreshResponse
import com.example.loginapp.data.repository.AuthRepository
import com.example.loginapp.data.repository.DeviceRepository
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * Minimal Retrofit interface used only inside the interceptor
 * to avoid a circular dependency with the main ApiService.
 */
private interface RefreshApi {
    @POST("auth/refresh")
    suspend fun refresh(@Body request: RefreshRequest): retrofit2.Response<RefreshResponse>
}

class AuthInterceptor(
    private val authRepository: AuthRepository,
    private val deviceRepository: DeviceRepository,
) : Interceptor {

    @Volatile private var isRefreshing = false

    override fun intercept(chain: Interceptor.Chain): Response {
        val token    = authRepository.getToken()
        val deviceId = deviceRepository.getDeviceIdBlocking()

        val request  = chain.request().withAuth(token, deviceId)
        val response = chain.proceed(request)

        // Only attempt refresh on 401 for non-auth endpoints
        if (response.code == 401 && !chain.request().url.pathSegments.contains("refresh")) {
            response.close()

            val newToken = tryRefreshBlocking()
                ?: return chain.proceed(chain.request().withAuth(null, deviceId))

            // Retry with the new token
            return chain.proceed(chain.request().withAuth(newToken, deviceId))
        }

        return response
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private fun Request.withAuth(token: String?, deviceId: String): Request =
        newBuilder()
            .addHeader("X-Device-Id", deviceId)
            .apply { if (!token.isNullOrBlank()) addHeader("Authorization", "Bearer $token") }
            .build()

    /**
     * Synchronous (blocking) token refresh.
     * Returns the new access token on success, null if refresh failed (session expired).
     */
    private fun tryRefreshBlocking(): String? {
        if (isRefreshing) return null
        synchronized(this) {
            if (isRefreshing) return null
            isRefreshing = true
            try {
                val refreshToken = authRepository.getRefreshToken() ?: run {
                    authRepository.clearSession()
                    return null
                }

                val refreshApi = Retrofit.Builder()
                    .baseUrl(RetrofitClient.getBaseUrl())
                    .addConverterFactory(GsonConverterFactory.create())
                    .build()
                    .create(RefreshApi::class.java)

                val result = runBlocking {
                    try { refreshApi.refresh(RefreshRequest(refreshToken)) }
                    catch (_: Exception) { null }
                }

                return if (result != null && result.isSuccessful && result.body() != null) {
                    val body = result.body()!!
                    authRepository.saveToken(body.access_token)
                    authRepository.saveRefreshToken(body.refresh_token)
                    body.access_token
                } else {
                    authRepository.clearSession()
                    null
                }
            } finally {
                isRefreshing = false
            }
        }
    }
}
