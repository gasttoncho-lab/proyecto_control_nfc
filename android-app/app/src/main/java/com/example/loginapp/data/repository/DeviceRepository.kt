package com.example.loginapp.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import java.util.UUID

private val Context.deviceDataStore by preferencesDataStore(name = "device_prefs")

class DeviceRepository(private val context: Context) {
    private val deviceIdKey = stringPreferencesKey("device_id")
    @Volatile
    private var cachedDeviceId: String? = null

    suspend fun getDeviceId(): String {
        cachedDeviceId?.let { return it }
        val preferences = context.deviceDataStore.data.first()
        val existing = preferences[deviceIdKey]
        if (!existing.isNullOrBlank()) {
            cachedDeviceId = existing
            return existing
        }

        val generated = UUID.randomUUID().toString()
        context.deviceDataStore.edit { it[deviceIdKey] = generated }
        cachedDeviceId = generated
        return generated
    }

    fun getDeviceIdBlocking(): String = runBlocking { getDeviceId() }
}
