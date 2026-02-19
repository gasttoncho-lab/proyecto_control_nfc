package com.example.loginapp.data.model

data class ReplaceStartRequest(
    val eventId: String,
    val oldWristbandId: String,
    val reason: String,
)

data class ReplaceStartResponse(
    val replaceSessionId: String,
    val balanceCents: Int,
    val expiresAt: String,
)

data class ReplaceFinishRequest(
    val replaceSessionId: String,
    val newTagUidHex: String,
)

data class ReplaceFinishResponse(
    val newWristbandId: String,
    val transferredCents: Int,
    val oldWristbandId: String,
)
