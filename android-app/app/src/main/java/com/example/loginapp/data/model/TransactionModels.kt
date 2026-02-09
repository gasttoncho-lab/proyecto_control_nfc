package com.example.loginapp.data.model

data class TopupRequest(
    val transactionId: String,
    val eventId: String? = null,
    val uidHex: String,
    val tagIdHex: String,
    val ctr: Int,
    val sigHex: String,
    val amountCents: Long
)

data class TopupResponse(
    val status: String,
    val balanceCents: Long
)

data class BalanceCheckRequest(
    val transactionId: String,
    val eventId: String? = null,
    val uidHex: String,
    val tagIdHex: String,
    val ctr: Int,
    val sigHex: String
)

data class BalanceCheckResponse(
    val status: String,
    val balanceCents: Long,
    val wristbandStatus: String
)
