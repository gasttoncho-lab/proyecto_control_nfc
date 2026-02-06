package com.example.loginapp.nfc

import android.nfc.Tag
import android.nfc.tech.MifareUltralight
import java.nio.ByteBuffer
import java.nio.ByteOrder

object NfcUtils {
    private const val START_PAGE = 4
    private const val PAYLOAD_LENGTH = 28

    fun uidHex(tag: Tag): String {
        return tag.id.joinToString("") { "%02x".format(it) }
    }

    fun readPayload(tag: Tag): NfcPayload {
        val ultralight = MifareUltralight.get(tag)
            ?: throw IllegalStateException("Tag no soportado")
        ultralight.connect()
        val first = ultralight.readPages(START_PAGE)
        val second = ultralight.readPages(START_PAGE + 4)
        ultralight.close()
        val data = (first + second).copyOf(PAYLOAD_LENGTH)
        return parsePayload(data)
    }

    fun writePayload(tag: Tag, tagIdHex: String, ctr: Int, sigHex: String) {
        val payload = buildPayload(tagIdHex, ctr, sigHex)
        val ultralight = MifareUltralight.get(tag)
            ?: throw IllegalStateException("Tag no soportado")
        ultralight.connect()
        payload.toList().chunked(4).forEachIndexed { index, chunk ->
            val page = START_PAGE + index
            ultralight.writePage(page, chunk.toByteArray())
        }
        ultralight.close()
    }

    private fun parsePayload(bytes: ByteArray): NfcPayload {
        val tagIdBytes = bytes.copyOfRange(0, 16)
        val ctrBytes = bytes.copyOfRange(16, 20)
        val sigBytes = bytes.copyOfRange(20, 28)
        val ctr = ByteBuffer.wrap(ctrBytes).order(ByteOrder.BIG_ENDIAN).int
        return NfcPayload(
            tagIdHex = tagIdBytes.joinToString("") { "%02x".format(it) },
            ctr = ctr,
            sigHex = sigBytes.joinToString("") { "%02x".format(it) }
        )
    }

    private fun buildPayload(tagIdHex: String, ctr: Int, sigHex: String): ByteArray {
        val tagIdBytes = tagIdHex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
        val ctrBytes = ByteBuffer.allocate(4).order(ByteOrder.BIG_ENDIAN).putInt(ctr).array()
        val sigBytes = sigHex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
        return tagIdBytes + ctrBytes + sigBytes
    }
}
