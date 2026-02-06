package com.example.loginapp.data.model

data class TopupRequest(
    val transactionId: String,
    val eventId: String,
    val uidHex: String,
    val tagIdHex: String,
    val ctr: Int,
    val sigHex: String,
    val amountCents: Int
)

data class TopupResponse(
    val status: String,
    val balanceCents: Int
)

data class BalanceCheckRequest(
    val transactionId: String,
    val eventId: String,
    val uidHex: String,
    val tagIdHex: String,
    val ctr: Int,
    val sigHex: String
)

data class BalanceCheckResponse(
    val status: String,
    val balanceCents: Int,
    val wristbandStatus: String
)
