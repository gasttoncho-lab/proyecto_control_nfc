package com.example.loginapp.data.model

data class ProductDto(
    val id: String,
    val name: String,
    val priceCents: Int,
    val isActive: Boolean
)

data class ChargeItemDto(
    val productId: String,
    val qty: Int
)

data class ChargePrepareRequest(
    val transactionId: String,
    val uidHex: String,
    val tagIdHex: String,
    val ctr: Int,
    val sigHex: String,
    val items: List<ChargeItemDto>
)

data class ChargePrepareResponse(
    val status: String,
    val totalCents: Int,
    val ctrNew: Int? = null,
    val sigNewHex: String? = null,
    val expiresAt: String? = null,
    val reason: String? = null
)

data class ChargeCommitRequest(
    val transactionId: String
)

data class ChargeCommitResponse(
    val status: String,
    val totalCents: Int,
    val reason: String? = null
)
