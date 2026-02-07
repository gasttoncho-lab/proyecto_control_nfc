package com.example.loginapp.data.model

data class DeviceSessionResponse(
    val authorized: Boolean,
    val device: DeviceSessionDevice? = null,
    val event: DeviceSessionEvent? = null,
    val booth: DeviceSessionBooth? = null
)

data class DeviceSessionDevice(
    val deviceId: String,
    val mode: String
)

data class DeviceSessionEvent(
    val id: String,
    val name: String,
    val status: String
)

data class DeviceSessionBooth(
    val id: String,
    val name: String
)
