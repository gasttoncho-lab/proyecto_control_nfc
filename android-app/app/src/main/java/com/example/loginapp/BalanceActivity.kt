package com.example.loginapp

import android.content.Intent
import android.graphics.Color
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.loginapp.data.model.BalanceCheckRequest
import com.example.loginapp.data.model.WristbandInitRequest
import com.example.loginapp.data.repository.AuthRepository
import com.example.loginapp.data.repository.DeviceRepository
import com.example.loginapp.data.repository.OperationsRepository
import com.example.loginapp.databinding.ActivityBalanceBinding
import com.example.loginapp.nfc.NfcUtils
import com.example.loginapp.util.CentsFormat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.net.SocketTimeoutException
import java.util.UUID

class BalanceActivity : AppCompatActivity(), NfcAdapter.ReaderCallback {

    private lateinit var binding: ActivityBalanceBinding
    private lateinit var authRepository: AuthRepository
    private lateinit var deviceRepository: DeviceRepository
    private lateinit var operationsRepository: OperationsRepository
    private var processing = false
    private var pendingTransactionId: String? = null
    private var nfcAdapter: NfcAdapter? = null
    private var canOperate = false

    private val pendingPrefs by lazy { getSharedPreferences("topup_balance_pending", MODE_PRIVATE) }
    private val pendingTtlMs = 5 * 60 * 1000L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBalanceBinding.inflate(layoutInflater)
        setContentView(binding.root)

        authRepository = AuthRepository(this)
        deviceRepository = DeviceRepository(this)
        operationsRepository = OperationsRepository(authRepository, deviceRepository)
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        if (nfcAdapter == null) {
            Toast.makeText(this, "NFC no disponible en este dispositivo", Toast.LENGTH_LONG).show()
        }

        binding.btnRetry.setOnClickListener {
            binding.tvGuide.text = "Reintento armado: acerque la misma pulsera"
        }

        restorePending()
        refreshSession()
    }

    override fun onResume() {
        super.onResume()
        restorePending()
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
    }

    override fun onTagDiscovered(tag: Tag) {
        if (!canOperate) {
            runOnUiThread {
                showErrorPanel("Dispositivo no autorizado o evento cerrado")
            }
            return
        }
        if (processing) return
        processing = true
        runOnUiThread { setProcessing(true) }

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val uidHex = NfcUtils.uidHex(tag)
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
                    binding.tvDebug.text = "UID: $uidHex\nTAG: ${payload.tagIdHex}\nCTR: ${payload.ctr}\nSIG: ${payload.sigHex}"
                }
                val transactionId = pendingTransactionId ?: UUID.randomUUID().toString()
                savePending(transactionId, "BALANCE", uidHex)

                val balanceResult = operationsRepository.balanceCheck(
                    BalanceCheckRequest(
                        transactionId = transactionId,
                        uidHex = uidHex,
                        tagIdHex = payload.tagIdHex,
                        ctr = payload.ctr,
                        sigHex = payload.sigHex
                    )
                )

                balanceResult.onSuccess { response ->
                    pendingTransactionId = null
                        clearPending()
                    runOnUiThread {
                        showResultPanel(
                            "STATUS: ${response.status} (${response.wristbandStatus})",
                            "Saldo: ${CentsFormat.show(response.balanceCents)}"
                        )
                    }
                }

                balanceResult.onFailure { error ->
                    if (error is SocketTimeoutException) {
                        pendingTransactionId = transactionId
                        savePending(transactionId, "BALANCE", uidHex)
                        handleError("Timeout. Reintente con la misma pulsera.")
                    } else {
                        pendingTransactionId = null
                        clearPending()
                        handleError(error.message)
                    }
                }
            } catch (ex: Exception) {
                handleError(ex.message)
            } finally {
                runOnUiThread { setProcessing(false) }
                processing = false
            }
        }
    }

    private fun restorePending() {
        val type = pendingPrefs.getString("type", null)
        val createdAt = pendingPrefs.getLong("createdAt", 0L)
        val transactionId = pendingPrefs.getString("transactionId", null)
        val expired = createdAt <= 0L || (System.currentTimeMillis() - createdAt) > pendingTtlMs

        if (type == "BALANCE" && !expired && !transactionId.isNullOrBlank()) {
            pendingTransactionId = transactionId
            binding.btnRetry.visibility = View.VISIBLE
            binding.tvGuide.text = "Hay un balance pendiente para reintentar"
        } else {
            clearPending()
        }
    }

    private fun savePending(transactionId: String, type: String, wristbandId: String) {
        pendingPrefs.edit()
            .putString("transactionId", transactionId)
            .putLong("createdAt", System.currentTimeMillis())
            .putString("type", type)
            .putString("wristbandId", wristbandId)
            .apply()
        runOnUiThread { binding.btnRetry.visibility = View.VISIBLE }
    }

    private fun clearPending() {
        pendingPrefs.edit().clear().apply()
        runOnUiThread { binding.btnRetry.visibility = View.GONE }
    }

    private fun setProcessing(loading: Boolean) {
        binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        binding.btnRetry.isEnabled = !loading
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
            }
            result.onFailure { error ->
                if (error.message == "UNAUTHORIZED") {
                    authRepository.clearSession()
                    val intent = Intent(this@BalanceActivity, MainActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    startActivity(intent)
                    finish()
                } else {
                    binding.tvEventName.text = "No se pudo cargar sesión"
                    canOperate = false
                }
            }
        }
    }

    private fun handleError(message: String?) {
        runOnUiThread {
            setProcessing(false)
            processing = false
            if (message == "UNAUTHORIZED") {
                authRepository.clearSession()
                val intent = Intent(this, MainActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
            } else {
                showErrorPanel(message ?: "desconocido")
            }
        }
    }

    private fun showResultPanel(statusText: String, balanceText: String) {
        binding.resultPanel.visibility = View.VISIBLE
        binding.resultPanel.setBackgroundColor(Color.parseColor("#1B5E20"))
        binding.tvStatusBig.text = statusText
        binding.tvBalanceBig.text = balanceText
    }

    private fun showErrorPanel(message: String) {
        binding.resultPanel.visibility = View.VISIBLE
        binding.resultPanel.setBackgroundColor(Color.parseColor("#C62828"))
        binding.tvStatusBig.text = "Error: $message"
        binding.tvBalanceBig.text = ""
    }
}
