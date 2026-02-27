package com.example.loginapp.data.model

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val access_token: String,
    val refresh_token: String,
    val user: User
)

data class RefreshRequest(
    val refresh_token: String
)

data class RefreshResponse(
    val access_token: String,
    val refresh_token: String
)

data class LogoutRequest(
    val refresh_token: String
)

data class User(
    val id: String,
    val email: String,
    val name: String
)

data class ErrorResponse(
    val message: String,
    val statusCode: Int? = null
)
