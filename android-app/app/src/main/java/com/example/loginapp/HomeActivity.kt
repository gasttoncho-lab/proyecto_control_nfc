package com.example.loginapp

import android.content.Intent
import android.os.Bundle
import timber.log.Timber
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
    private var deviceMode: String? = null
    
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
        lifecycleScope.launch {
            refreshSessionUi()
        }
    }
    
    private fun loadUserData() {
        val user = authRepository.getSavedUser()
        user?.let {
            binding.tvWelcome.text = "¡Bienvenido!"
            binding.tvUserName.text = it.name
            binding.tvUserEmail.text = it.email
        }
    }

    private suspend fun refreshSessionUi(): Boolean {
        val deviceId = deviceRepository.getDeviceId()
        binding.tvDeviceId.text = "Device ID: $deviceId"
        binding.tvBaseUrl.text = "Base URL: ${BuildConfig.BASE_URL}"

        val result = operationsRepository.getDeviceSession()
        result.onSuccess { session ->
            if (!session.authorized) {
                binding.tvDeviceStatus.text = "Estado: No autorizado"
                binding.tvAssignedEvent.text = "Evento asignado: -"
                binding.tvMode.text = "Modo: -"
                binding.tvBooth.text = "Booth: -"
                binding.tvEventStatus.text = "Estado evento: -"
                binding.tvSessionStatusCode.text =
                    "Status /devices/session: ${operationsRepository.lastSessionStatusCode ?: "-"}"
                canOperate = false
                deviceMode = null
                updateButtons()
                return false
            }

            binding.tvDeviceStatus.text = "Estado: Autorizado"
            binding.tvAssignedEvent.text = "Evento asignado: ${session.event?.name ?: "-"}"
            deviceMode = session.device?.mode
            binding.tvMode.text = "Modo: ${deviceMode ?: "-"}"
            binding.tvBooth.text = "Booth: ${session.booth?.name ?: "-"}"
            binding.tvEventStatus.text = "Estado evento: ${session.event?.status ?: "-"}"
            binding.tvSessionStatusCode.text =
                "Status /devices/session: ${operationsRepository.lastSessionStatusCode ?: "-"}"
            canOperate = session.event?.status == "OPEN"
            updateButtons()
            return canOperate && (binding.btnCharge.isEnabled || binding.btnTopup.isEnabled || binding.btnBalance.isEnabled)
        }

        result.onFailure { error ->
            if (error.message == "UNAUTHORIZED") {
                performLogout()
            } else {
                binding.tvDeviceStatus.text = "Estado: Error al cargar sesión"
                binding.tvAssignedEvent.text = "Evento asignado: -"
                binding.tvMode.text = "Modo: -"
                binding.tvBooth.text = "Booth: -"
                binding.tvEventStatus.text = "Estado evento: -"
                binding.tvSessionStatusCode.text =
                    "Status /devices/session: ${operationsRepository.lastSessionStatusCode ?: "ERROR"}"
                canOperate = false
                deviceMode = null
                updateButtons()
            }
        }

        return false
    }

    private fun gateAndRun(action: () -> Unit) {
        lifecycleScope.launch {
            if (refreshSessionUi()) {
                action()
            }
        }
    }
    
    private fun setupListeners() {
        binding.btnCharge.setOnClickListener {
            gateAndRun {
                val intent = Intent(this, ChargeActivity::class.java)
                startActivity(intent)
            }
        }

        binding.btnTopup.setOnClickListener {
            gateAndRun {
                val intent = Intent(this, TopupActivity::class.java)
                startActivity(intent)
            }
        }

        binding.btnBalance.setOnClickListener {
            gateAndRun {
                val intent = Intent(this, BalanceActivity::class.java)
                startActivity(intent)
            }
        }

        binding.btnRefresh.setOnClickListener {
            lifecycleScope.launch {
                refreshSessionUi()
            }
        }

        binding.btnLogout.setOnClickListener {
            performLogout()
        }
    }

    private fun updateButtons() {
        if (!canOperate) {
            binding.btnCharge.isEnabled = false
            binding.btnTopup.isEnabled = false
            binding.btnBalance.isEnabled = false
            binding.tvOperationHint.text = "Operaciones bloqueadas (dispositivo no autorizado o evento cerrado)"
            return
        }

        when (deviceMode) {
            "TOPUP" -> {
                binding.btnCharge.isEnabled = false
                binding.btnTopup.isEnabled = true
                binding.btnBalance.isEnabled = true
                binding.tvOperationHint.text = "Modo cargador (TOPUP)"
            }
            "CHARGE" -> {
                binding.btnCharge.isEnabled = true
                binding.btnTopup.isEnabled = false
                binding.btnBalance.isEnabled = true
                binding.tvOperationHint.text = "Modo cajero (CHARGE)"
            }
            else -> {
                binding.btnCharge.isEnabled = false
                binding.btnTopup.isEnabled = false
                binding.btnBalance.isEnabled = false
                binding.tvOperationHint.text = "Operaciones bloqueadas (dispositivo no autorizado o evento cerrado)"
            }
        }
    }
    
    private fun performLogout() {
        Timber.i("LOGOUT")
        lifecycleScope.launch {
            authRepository.logout()
            val intent = Intent(this@HomeActivity, MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }
    }
}
