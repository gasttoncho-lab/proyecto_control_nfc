package com.example.loginapp.data.api

import com.example.loginapp.data.model.LoginRequest
import com.example.loginapp.data.model.LoginResponse
import com.example.loginapp.data.model.User
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface ApiService {
    
    @POST("auth/login")
    suspend fun login(@Body loginRequest: LoginRequest): Response<LoginResponse>
    
    @GET("auth/me")
    suspend fun getProfile(@Header("Authorization") token: String): Response<User>
    
    companion object {
        const val BASE_URL = "http://10.10.0.155:3000/" // Para emulador Android
        // Para dispositivo real usar: "http://TU_IP_LOCAL:3000/"
    }
}
