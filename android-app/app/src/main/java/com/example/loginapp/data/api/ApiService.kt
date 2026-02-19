package com.example.loginapp.data.api

import com.example.loginapp.data.model.BalanceCheckRequest
import com.example.loginapp.data.model.BalanceCheckResponse
import com.example.loginapp.data.model.ChargeCommitRequest
import com.example.loginapp.data.model.ChargeCommitResponse
import com.example.loginapp.data.model.ChargePrepareRequest
import com.example.loginapp.data.model.ChargePrepareResponse
import com.example.loginapp.data.model.LoginRequest
import com.example.loginapp.data.model.LoginResponse
import com.example.loginapp.data.model.ProductDto
import com.example.loginapp.data.model.ReplaceFinishRequest
import com.example.loginapp.data.model.ReplaceFinishResponse
import com.example.loginapp.data.model.ReplaceStartRequest
import com.example.loginapp.data.model.ReplaceStartResponse
import com.example.loginapp.data.model.TopupRequest
import com.example.loginapp.data.model.TopupResponse
import com.example.loginapp.data.model.User
import com.example.loginapp.data.model.DeviceSessionResponse
import com.example.loginapp.data.model.WristbandInitRequest
import com.example.loginapp.data.model.WristbandInitResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface ApiService {
    
    @POST("auth/login")
    suspend fun login(@Body loginRequest: LoginRequest): Response<LoginResponse>
    
    @GET("auth/me")
    suspend fun getProfile(): Response<User>

    @GET("devices/session")
    suspend fun getDeviceSession(): Response<DeviceSessionResponse>

    @GET("catalog/products")
    suspend fun getCatalogProducts(): Response<List<ProductDto>>

    @POST("wristbands/init")
    suspend fun initWristband(@Body request: WristbandInitRequest): Response<WristbandInitResponse>

    @POST("topups")
    suspend fun topup(@Body request: TopupRequest): Response<TopupResponse>

    @POST("balance-check")
    suspend fun balanceCheck(@Body request: BalanceCheckRequest): Response<BalanceCheckResponse>

    @POST("charges/prepare")
    suspend fun chargePrepare(@Body request: ChargePrepareRequest): Response<ChargePrepareResponse>

    @POST("charges/commit")
    suspend fun chargeCommit(@Body request: ChargeCommitRequest): Response<ChargeCommitResponse>

    @POST("devices/replace/start")
    suspend fun replaceStart(@Body request: ReplaceStartRequest): Response<ReplaceStartResponse>

    @POST("devices/replace/finish")
    suspend fun replaceFinish(@Body request: ReplaceFinishRequest): Response<ReplaceFinishResponse>
}
