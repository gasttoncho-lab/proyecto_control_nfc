package com.example.loginapp.data.model

data class WristbandInitRequest(
    val eventId: String,
    val uidHex: String
)

data class WristbandInitResponse(
    val alreadyInitialized: Boolean,
    val tagIdHex: String,
    val ctrCurrent: Int,
    val sigHex: String
)
