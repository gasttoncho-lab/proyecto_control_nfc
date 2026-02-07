package com.example.loginapp

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.loginapp.data.repository.AuthRepository
import com.example.loginapp.data.repository.DeviceRepository
import com.example.loginapp.data.repository.OperationsRepository
import com.example.loginapp.databinding.ActivityHomeBinding
import kotlinx.coroutines.launch

class HomeActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityHomeBinding
    private lateinit var authRepository: AuthRepository
    private lateinit var deviceRepository: DeviceRepository
    private lateinit var operationsRepository: OperationsRepository
    private var canOperate: Boolean = false
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        authRepository = AuthRepository(this)
        deviceRepository = DeviceRepository(this)
        operationsRepository = OperationsRepository(authRepository, deviceRepository)
        
        loadUserData()
        setupListeners()
    }

    override fun onResume() {
        super.onResume()
        loadUserData()
        refreshSession()
    }
    
    private fun loadUserData() {
        val user = authRepository.getSavedUser()
        user?.let {
            binding.tvWelcome.text = "¡Bienvenido!"
            binding.tvUserName.text = it.name
            binding.tvUserEmail.text = it.email
        }
    }

    private fun refreshSession() {
        lifecycleScope.launch {
            val deviceId = deviceRepository.getDeviceId()
            binding.tvDeviceId.text = "Device ID: $deviceId"

            val result = operationsRepository.getDeviceSession()
            result.onSuccess { session ->
                if (!session.authorized) {
                    binding.tvDeviceStatus.text = "Estado: No autorizado"
                    binding.tvAssignedEvent.text = "Evento asignado: -"
                    binding.tvMode.text = "Modo: -"
                    binding.tvEventStatus.text = "Estado evento: -"
                    canOperate = false
                    updateButtons()
                    return@onSuccess
                }

                binding.tvDeviceStatus.text = "Estado: Autorizado"
                binding.tvAssignedEvent.text = "Evento asignado: ${session.event?.name ?: "-"}"
                binding.tvMode.text = "Modo: ${session.device?.mode ?: "-"}"
                binding.tvEventStatus.text = "Estado evento: ${session.event?.status ?: "-"}"
                canOperate = session.event?.status == "OPEN"
                updateButtons()
            }

            result.onFailure { error ->
                if (error.message == "UNAUTHORIZED") {
                    performLogout()
                } else {
                    binding.tvDeviceStatus.text = "Estado: Error al cargar sesión"
                    canOperate = false
                    updateButtons()
                }
            }
        }
    }
    
    private fun setupListeners() {
        binding.btnTopup.setOnClickListener {
            val intent = Intent(this, TopupActivity::class.java)
            startActivity(intent)
        }

        binding.btnBalance.setOnClickListener {
            val intent = Intent(this, BalanceActivity::class.java)
            startActivity(intent)
        }

        binding.btnLogout.setOnClickListener {
            performLogout()
        }
    }

    private fun updateButtons() {
        binding.btnTopup.isEnabled = canOperate
        binding.btnBalance.isEnabled = canOperate
        binding.tvOperationHint.text = if (canOperate) {
            "Operaciones habilitadas"
        } else {
            "Operaciones bloqueadas (dispositivo no autorizado o evento cerrado)"
        }
    }
    
    private fun performLogout() {
        authRepository.logout()
        
        val intent = Intent(this, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
