package com.example.loginapp.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.example.loginapp.data.api.RetrofitClient
import com.example.loginapp.data.model.LoginRequest
import com.example.loginapp.data.model.LoginResponse
import com.example.loginapp.data.model.User

class AuthRepository(context: Context) {
    
    private val apiService = RetrofitClient.create(this)
    private val sharedPreferences: SharedPreferences = 
        context.getSharedPreferences("LoginAppPrefs", Context.MODE_PRIVATE)
    
    suspend fun login(email: String, password: String): Result<LoginResponse> {
        return try {
            val response = apiService.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                saveToken(loginResponse.access_token)
                saveUser(loginResponse.user)
                Result.success(loginResponse)
            } else {
                Result.failure(Exception("Credenciales inválidas"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getProfile(): Result<User> {
        return try {
            val token = getToken()
            if (token.isNullOrEmpty()) {
                return Result.failure(Exception("No hay sesión activa"))
            }
            
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
    
    fun saveToken(token: String) {
        sharedPreferences.edit().putString("auth_token", token).apply()
    }
    
    fun getToken(): String? {
        return sharedPreferences.getString("auth_token", null)
    }
    
    fun saveUser(user: User) {
        sharedPreferences.edit()
            .putString("user_id", user.id)
            .putString("user_email", user.email)
            .putString("user_name", user.name)
            .apply()
    }
    
    fun getSavedUser(): User? {
        val id = sharedPreferences.getString("user_id", null)
        val email = sharedPreferences.getString("user_email", null)
        val name = sharedPreferences.getString("user_name", null)
        
        return if (id != null && email != null && name != null) {
            User(id, email, name)
        } else {
            null
        }
    }
    
    fun isLoggedIn(): Boolean {
        return !getToken().isNullOrEmpty()
    }

    fun saveSelectedEvent(id: String, name: String) {
        sharedPreferences.edit()
            .putString("event_id", id)
            .putString("event_name", name)
            .apply()
    }

    fun getSelectedEventId(): String? {
        return sharedPreferences.getString("event_id", null)
    }

    fun getSelectedEventName(): String? {
        return sharedPreferences.getString("event_name", null)
    }

    fun clearSelectedEvent() {
        sharedPreferences.edit()
            .remove("event_id")
            .remove("event_name")
            .apply()
    }
    
    fun logout() {
        sharedPreferences.edit().clear().apply()
    }
}
