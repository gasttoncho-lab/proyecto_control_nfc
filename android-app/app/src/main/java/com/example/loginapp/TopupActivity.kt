package com.example.loginapp

import android.content.Intent
import android.graphics.Color
import android.media.AudioManager
import android.media.ToneGenerator
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.loginapp.data.model.TopupRequest
import com.example.loginapp.data.model.WristbandInitRequest
import com.example.loginapp.data.repository.AuthRepository
import com.example.loginapp.data.repository.DeviceRepository
import com.example.loginapp.data.repository.OperationsRepository
import com.example.loginapp.databinding.ActivityTopupBinding
import com.example.loginapp.nfc.NfcUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.net.SocketTimeoutException
import java.util.UUID

class TopupActivity : AppCompatActivity(), NfcAdapter.ReaderCallback {

    enum class TopupState {
        IDLE,
        ARMED,
        PROCESSING,
        COOLDOWN
    }

    private lateinit var binding: ActivityTopupBinding
    private lateinit var authRepository: AuthRepository
    private lateinit var deviceRepository: DeviceRepository
    private lateinit var operationsRepository: OperationsRepository

    private var pendingTransactionId: String? = null
    private var nfcAdapter: NfcAdapter? = null
    private var canOperate = false
    private var state: TopupState = TopupState.IDLE

    private var lastUidHex: String? = null
    private var lastUidTimestamp: Long = 0L

    private val cooldownHandler = Handler(Looper.getMainLooper())
    private val cooldownRunnable = Runnable {
        state = TopupState.IDLE
        binding.tvStatus.text = "Listo para cargar"
        hideSuccessPanel()
        updateUiForState()
        binding.etAmount.setText("")
        binding.etAmount.requestFocus()
        binding.etAmount.setSelection(binding.etAmount.text.length)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityTopupBinding.inflate(layoutInflater)
        setContentView(binding.root)

        authRepository = AuthRepository(this)
        deviceRepository = DeviceRepository(this)
        operationsRepository = OperationsRepository(authRepository, deviceRepository)
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        binding.btnRead.setOnClickListener {
            when (state) {
                TopupState.IDLE -> {
                    val amountCents = binding.etAmount.text.toString().toIntOrNull()
                    if (amountCents == null || amountCents <= 0) {
                        binding.etAmount.error = "Monto inválido"
                        return@setOnClickListener
                    }
                    state = TopupState.ARMED
                    binding.tvStatus.text = "ARMED: apoye pulsera"
                    hideSuccessPanel()
                    updateUiForState()
                }

                TopupState.ARMED -> {
                    state = TopupState.IDLE
                    binding.tvStatus.text = "Operación cancelada"
                    hideSuccessPanel()
                    updateUiForState()
                }

                TopupState.PROCESSING, TopupState.COOLDOWN -> Unit
            }
        }

        if (nfcAdapter == null) {
            Toast.makeText(this, "NFC no disponible en este dispositivo", Toast.LENGTH_LONG).show()
            binding.btnRead.isEnabled = false
        }

        refreshSession()
        updateUiForState()
    }

    override fun onResume() {
        super.onResume()
        refreshSession()
        nfcAdapter?.enableReaderMode(
            this,
            this,
            NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
            null
        )
    }

    override fun onPause() {
        super.onPause()
        nfcAdapter?.disableReaderMode(this)
        cooldownHandler.removeCallbacks(cooldownRunnable)
    }

    override fun onTagDiscovered(tag: Tag) {
        if (!canOperate) {
            runOnUiThread { binding.tvStatus.text = "Dispositivo no autorizado o evento cerrado" }
            return
        }
        if (state != TopupState.ARMED) return

        val amountCents = binding.etAmount.text.toString().toIntOrNull()
        if (amountCents == null || amountCents <= 0) {
            runOnUiThread { binding.etAmount.error = "Monto inválido" }
            return
        }

        val uidHex = NfcUtils.uidHex(tag)
        val now = System.currentTimeMillis()
        if (uidHex == lastUidHex && (now - lastUidTimestamp) < 1000) return
        lastUidHex = uidHex
        lastUidTimestamp = now

        state = TopupState.PROCESSING
        runOnUiThread {
            binding.tvStatus.text = "Procesando topup..."
            hideSuccessPanel()
            updateUiForState()
        }

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val initResult = operationsRepository.initWristband(WristbandInitRequest(uidHex = uidHex))
                initResult.onFailure { error ->
                    handleError(error.message)
                    return@launch
                }

                val initResponse = initResult.getOrNull() ?: run {
                    handleError("Error inicializando pulsera")
                    return@launch
                }

                if (!initResponse.alreadyInitialized) {
                    NfcUtils.writePayload(tag, initResponse.tagIdHex, initResponse.ctrCurrent, initResponse.sigHex)
                }

                val payload = NfcUtils.readPayload(tag)
                runOnUiThread {
                    binding.tvDebug.text =
                        "UID: $uidHex\nTAG: ${payload.tagIdHex}\nCTR: ${payload.ctr}\nSIG: ${payload.sigHex}"
                }

                val transactionId = pendingTransactionId ?: UUID.randomUUID().toString()

                val topupResult = operationsRepository.topup(
                    TopupRequest(
                        transactionId = transactionId,
                        uidHex = uidHex,
                        tagIdHex = payload.tagIdHex,
                        ctr = payload.ctr,
                        sigHex = payload.sigHex,
                        amountCents = amountCents
                    )
                )

                topupResult.onSuccess { response ->
                    pendingTransactionId = null
                    runOnUiThread {
                        binding.tvStatus.text = "STATUS: ${response.status}"
                        binding.tvBalance.text = "Saldo: ${response.balanceCents} centavos"

                        showSuccessPanel(amountCents, response.balanceCents)

                        playSuccessFeedback()

                        binding.etAmount.setText("")

                        state = TopupState.COOLDOWN
                        updateUiForState()

                        cooldownHandler.removeCallbacks(cooldownRunnable)
                        cooldownHandler.postDelayed(cooldownRunnable, 3000L)
                    }
                }

                topupResult.onFailure { error ->
                    if (error is SocketTimeoutException) {
                        pendingTransactionId = transactionId
                        handleError("Timeout. Reintente con la misma pulsera.")
                    } else {
                        pendingTransactionId = null
                        handleError(error.message)
                    }
                }
            } catch (ex: Exception) {
                handleError(ex.message)
            }
        }
    }

    private fun updateUiForState() {
        val enabled = canOperate

        binding.progressBar.visibility = if (state == TopupState.PROCESSING) View.VISIBLE else View.GONE

        binding.btnRead.isEnabled = enabled && state != TopupState.PROCESSING && state != TopupState.COOLDOWN
        binding.etAmount.isEnabled = enabled && state == TopupState.IDLE

        binding.btnRead.text = when (state) {
            TopupState.IDLE -> "Armar"
            TopupState.ARMED -> "Cancelar"
            TopupState.PROCESSING -> "Procesando..."
            TopupState.COOLDOWN -> "Espere..."
        }

        if (!enabled) {
            binding.btnRead.isEnabled = false
            binding.etAmount.isEnabled = false
        }
    }

    private fun refreshSession() {
        lifecycleScope.launch {
            val result = operationsRepository.getDeviceSession()
            result.onSuccess { session ->
                if (!session.authorized) {
                    binding.tvEventName.text = "Dispositivo no autorizado"
                    canOperate = false
                } else {
                    val eventName = session.event?.name ?: "-"
                    val status = session.event?.status ?: "-"
                    binding.tvEventName.text = "Evento: $eventName ($status)"
                    canOperate = status == "OPEN"
                }
                updateUiForState()
            }
            result.onFailure { error ->
                if (error.message == "UNAUTHORIZED") {
                    authRepository.logout()
                    val intent = Intent(this@TopupActivity, MainActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    startActivity(intent)
                    finish()
                } else {
                    binding.tvEventName.text = "No se pudo cargar sesión"
                    canOperate = false
                    updateUiForState()
                }
            }
        }
    }

    private fun handleError(message: String?) {
        runOnUiThread {
            if (message == "UNAUTHORIZED") {
                authRepository.logout()
                val intent = Intent(this, MainActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
            } else {
                val msg = message ?: "desconocido"
                binding.tvStatus.text = "Error: $msg"
                showErrorPanel(msg)
                state = TopupState.ARMED
                updateUiForState()
            }
        }
    }

    private fun showSuccessPanel(amountCents: Int, balanceCents: Int?) {
        binding.successPanel.visibility = View.VISIBLE
        binding.successPanel.setBackgroundColor(Color.parseColor("#2E7D32"))
        binding.successTitle.text = "CARGADO OK"
        binding.successAmount.text = "+$ $amountCents"
        binding.successBalance.text = "Saldo: ${balanceCents ?: "-"}"
    }

    private fun showErrorPanel(message: String) {
        binding.successPanel.visibility = View.VISIBLE
        binding.successPanel.setBackgroundColor(Color.parseColor("#C62828"))
        binding.successTitle.text = "ERROR"
        binding.successAmount.text = message
        binding.successBalance.text = ""
    }

    private fun hideSuccessPanel() {
        binding.successPanel.visibility = View.GONE
    }

    private fun playSuccessFeedback() {
        val tone = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80)
        tone.startTone(ToneGenerator.TONE_PROP_BEEP, 150)
        Handler(Looper.getMainLooper()).postDelayed({ tone.release() }, 200)

        try {
            val vibrator = getSystemService(Vibrator::class.java)
            if (vibrator?.hasVibrator() == true) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(150, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(150)
                }
            }
        } catch (_: SecurityException) {
            // Si el permiso no está realmente aplicado por el manifest merger, NO crashear.
        }
    }
}
