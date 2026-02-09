package com.example.loginapp.data.repository

import com.example.loginapp.data.api.RetrofitClient
import com.example.loginapp.data.model.BalanceCheckRequest
import com.example.loginapp.data.model.BalanceCheckResponse
import com.example.loginapp.data.model.ChargeCommitRequest
import com.example.loginapp.data.model.ChargeCommitResponse
import com.example.loginapp.data.model.ChargePrepareRequest
import com.example.loginapp.data.model.ChargePrepareResponse
import com.example.loginapp.data.model.DeviceSessionResponse
import com.example.loginapp.data.model.ErrorResponse
import com.example.loginapp.data.model.ProductDto
import com.example.loginapp.data.model.TopupRequest
import com.example.loginapp.data.model.TopupResponse
import com.example.loginapp.data.model.WristbandInitRequest
import com.example.loginapp.data.model.WristbandInitResponse
import com.google.gson.Gson
import retrofit2.Response
import java.io.IOException
import java.net.SocketTimeoutException

class OperationsRepository(
    private val authRepository: AuthRepository,
    deviceRepository: DeviceRepository,
) {

    private val apiService = RetrofitClient.create(authRepository, deviceRepository)

    var lastSessionStatusCode: Int? = null
        private set

    suspend fun getDeviceSession(): Result<DeviceSessionResponse> {
        return safeCall {
            val response = apiService.getDeviceSession()
            lastSessionStatusCode = response.code()
            handleResponse(response)
        }
    }

    suspend fun getCatalogProducts(): Result<List<ProductDto>> {
        return safeCall { handleResponse(apiService.getCatalogProducts()) }
    }

    suspend fun initWristband(request: WristbandInitRequest): Result<WristbandInitResponse> {
        return safeCall { handleResponse(apiService.initWristband(request)) }
    }

    suspend fun topup(request: TopupRequest): Result<TopupResponse> {
        return safeCall { handleResponse(apiService.topup(request)) }
    }

    suspend fun balanceCheck(request: BalanceCheckRequest): Result<BalanceCheckResponse> {
        return safeCall { handleResponse(apiService.balanceCheck(request)) }
    }

    suspend fun chargePrepare(request: ChargePrepareRequest): Result<ChargePrepareResponse> {
        return safeCall { handleResponse(apiService.chargePrepare(request)) }
    }

    suspend fun chargeCommit(request: ChargeCommitRequest): Result<ChargeCommitResponse> {
        return safeCall { handleResponse(apiService.chargeCommit(request)) }
    }

    private fun <T> handleResponse(response: Response<T>): Result<T> {
        if (response.code() == 401) {
            authRepository.logout()
            return Result.failure(Exception("UNAUTHORIZED"))
        }

        val body = response.body()
        return if (response.isSuccessful && body != null) {
            Result.success(body)
        } else {
            val errorMessage = parseError(response)
            Result.failure(Exception(errorMessage))
        }
    }

    private fun <T> parseError(response: Response<T>): String {
        val errorBody = response.errorBody()?.string() ?: return "HTTP_${response.code()}"
        return try {
            val parsed = Gson().fromJson(errorBody, ErrorResponse::class.java)
            parsed.message ?: "HTTP_${response.code()}"
        } catch (ex: Exception) {
            "HTTP_${response.code()}"
        }
    }

    private suspend fun <T> safeCall(block: suspend () -> Result<T>): Result<T> {
        return try {
            block()
        } catch (ex: SocketTimeoutException) {
            Result.failure(ex)
        } catch (ex: IOException) {
            Result.failure(ex)
        } catch (ex: Exception) {
            Result.failure(ex)
        }
    }
}
