package com.example.loginapp

import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
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

    private lateinit var binding: ActivityTopupBinding
    private lateinit var authRepository: AuthRepository
    private lateinit var deviceRepository: DeviceRepository
    private lateinit var operationsRepository: OperationsRepository
    private var processing = false
    private var pendingTransactionId: String? = null
    private var nfcAdapter: NfcAdapter? = null
    private var canOperate = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityTopupBinding.inflate(layoutInflater)
        setContentView(binding.root)

        authRepository = AuthRepository(this)
        deviceRepository = DeviceRepository(this)
        operationsRepository = OperationsRepository(authRepository, deviceRepository)
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        binding.btnRead.setOnClickListener {
            Toast.makeText(this, "Acerque la pulsera al NFC", Toast.LENGTH_SHORT).show()
        }

        if (nfcAdapter == null) {
            Toast.makeText(this, "NFC no disponible en este dispositivo", Toast.LENGTH_LONG).show()
            binding.btnRead.isEnabled = false
        }

        refreshSession()
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
    }

    override fun onTagDiscovered(tag: Tag) {
        if (!canOperate) {
            runOnUiThread {
                binding.tvStatus.text = "Dispositivo no autorizado o evento cerrado"
            }
            return
        }
        if (processing) return
        val amountCents = binding.etAmount.text.toString().toIntOrNull()
        if (amountCents == null || amountCents <= 0) {
            runOnUiThread {
                binding.etAmount.error = "Monto inválido"
            }
            return
        }

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
            } finally {
                runOnUiThread { setProcessing(false) }
                processing = false
            }
        }
    }

    private fun setProcessing(loading: Boolean) {
        binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        binding.btnRead.isEnabled = !loading && canOperate
        binding.etAmount.isEnabled = !loading && canOperate
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
                binding.btnRead.isEnabled = canOperate
                binding.etAmount.isEnabled = canOperate
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
                    binding.btnRead.isEnabled = false
                    binding.etAmount.isEnabled = false
                }
            }
        }
    }

    private fun handleError(message: String?) {
        runOnUiThread {
            setProcessing(false)
            processing = false
            if (message == "UNAUTHORIZED") {
                authRepository.logout()
                val intent = Intent(this, MainActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
            } else {
                binding.tvStatus.text = "Error: ${message ?: "desconocido"}"
            }
        }
    }
}
