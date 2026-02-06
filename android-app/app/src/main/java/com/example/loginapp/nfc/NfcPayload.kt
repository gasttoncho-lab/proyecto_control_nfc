package com.example.loginapp.nfc

data class NfcPayload(
    val tagIdHex: String,
    val ctr: Int,
    val sigHex: String
)
