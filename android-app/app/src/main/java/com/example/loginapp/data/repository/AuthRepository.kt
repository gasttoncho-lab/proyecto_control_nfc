package com.example.loginapp.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.example.loginapp.data.api.RetrofitClient
import com.example.loginapp.data.model.LoginRequest
import com.example.loginapp.data.model.LoginResponse
import com.example.loginapp.data.model.LogoutRequest
import com.example.loginapp.data.model.RefreshRequest
import com.example.loginapp.data.model.User

class AuthRepository(context: Context) {

    private val deviceRepository = DeviceRepository(context)
    private val apiService = RetrofitClient.create(this, deviceRepository)
    private val prefs: SharedPreferences =
        context.getSharedPreferences("LoginAppPrefs", Context.MODE_PRIVATE)

    // ── Login ─────────────────────────────────────────────────────────────

    suspend fun login(email: String, password: String): Result<LoginResponse> {
        return try {
            val response = apiService.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                saveToken(body.access_token)
                saveRefreshToken(body.refresh_token)
                saveUser(body.user)
                Result.success(body)
            } else {
                Result.failure(Exception("Credenciales inválidas"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ── Refresh ───────────────────────────────────────────────────────────

    /**
     * Exchanges the stored refresh token for a new access + refresh token pair.
     * Returns true if successful, false if the session expired (must re-login).
     */
    suspend fun refreshTokens(): Boolean {
        val refreshToken = getRefreshToken() ?: return false
        return try {
            val response = apiService.refresh(RefreshRequest(refreshToken))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                saveToken(body.access_token)
                saveRefreshToken(body.refresh_token)
                true
            } else {
                clearSession()
                false
            }
        } catch (e: Exception) {
            false
        }
    }

    // ── Logout ────────────────────────────────────────────────────────────

    suspend fun logout() {
        val refreshToken = getRefreshToken()
        if (!refreshToken.isNullOrBlank()) {
            try { apiService.logout(LogoutRequest(refreshToken)) } catch (_: Exception) {}
        }
        clearSession()
    }

    // ── Profile ───────────────────────────────────────────────────────────

    suspend fun getProfile(): Result<User> {
        return try {
            val token = getToken()
            if (token.isNullOrEmpty()) return Result.failure(Exception("No hay sesión activa"))
            val response = apiService.getProfile()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Error al obtener perfil"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ── Storage ───────────────────────────────────────────────────────────

    fun saveToken(token: String) = prefs.edit().putString("auth_token", token).apply()
    fun getToken(): String? = prefs.getString("auth_token", null)

    fun saveRefreshToken(token: String) = prefs.edit().putString("refresh_token", token).apply()
    fun getRefreshToken(): String? = prefs.getString("refresh_token", null)

    fun saveUser(user: User) {
        prefs.edit()
            .putString("user_id", user.id)
            .putString("user_email", user.email)
            .putString("user_name", user.name)
            .apply()
    }

    fun getSavedUser(): User? {
        val id    = prefs.getString("user_id", null)
        val email = prefs.getString("user_email", null)
        val name  = prefs.getString("user_name", null)
        return if (id != null && email != null && name != null) User(id, email, name) else null
    }

    fun isLoggedIn(): Boolean = !getToken().isNullOrEmpty()

    fun clearSession() = prefs.edit().clear().apply()
}
