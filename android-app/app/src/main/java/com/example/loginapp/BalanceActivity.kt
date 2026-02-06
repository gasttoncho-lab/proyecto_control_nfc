package com.example.loginapp

import android.content.Intent
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
import com.example.loginapp.data.repository.OperationsRepository
import com.example.loginapp.databinding.ActivityBalanceBinding
import com.example.loginapp.nfc.NfcUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.net.SocketTimeoutException
import java.util.UUID

class BalanceActivity : AppCompatActivity(), NfcAdapter.ReaderCallback {

    companion object {
        const val EXTRA_EVENT_ID = "extra_event_id"
        const val EXTRA_EVENT_NAME = "extra_event_name"
    }

    private lateinit var binding: ActivityBalanceBinding
    private lateinit var authRepository: AuthRepository
    private lateinit var operationsRepository: OperationsRepository
    private var eventId: String = ""
    private var eventName: String = ""
    private var processing = false
    private var pendingTransactionId: String? = null
    private var nfcAdapter: NfcAdapter? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBalanceBinding.inflate(layoutInflater)
        setContentView(binding.root)

        eventId = intent.getStringExtra(EXTRA_EVENT_ID).orEmpty()
        eventName = intent.getStringExtra(EXTRA_EVENT_NAME).orEmpty()
        if (eventId.isBlank()) {
            val fallbackId = authRepository.getSelectedEventId().orEmpty()
            val fallbackName = authRepository.getSelectedEventName().orEmpty()
            eventId = fallbackId
            eventName = fallbackName
        }
        if (eventId.isBlank()) {
            val intent = Intent(this, EventSelectActivity::class.java)
            startActivity(intent)
            finish()
            return
        }

        authRepository = AuthRepository(this)
        operationsRepository = OperationsRepository(authRepository)
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        binding.tvEventName.text = eventName
        binding.btnRead.setOnClickListener {
            Toast.makeText(this, "Acerque la pulsera al NFC", Toast.LENGTH_SHORT).show()
        }

        if (nfcAdapter == null) {
            Toast.makeText(this, "NFC no disponible en este dispositivo", Toast.LENGTH_LONG).show()
            binding.btnRead.isEnabled = false
        }
    }

    override fun onResume() {
        super.onResume()
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
        if (processing) return
        processing = true
        runOnUiThread { setProcessing(true) }

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val uidHex = NfcUtils.uidHex(tag)
                val initResult = operationsRepository.initWristband(WristbandInitRequest(eventId, uidHex))
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

                val balanceResult = operationsRepository.balanceCheck(
                    BalanceCheckRequest(
                        transactionId = transactionId,
                        eventId = eventId,
                        uidHex = uidHex,
                        tagIdHex = payload.tagIdHex,
                        ctr = payload.ctr,
                        sigHex = payload.sigHex
                    )
                )

                balanceResult.onSuccess { response ->
                    pendingTransactionId = null
                    runOnUiThread {
                        binding.tvStatus.text = "STATUS: ${response.status} (${response.wristbandStatus})"
                        binding.tvBalance.text = "Saldo: ${response.balanceCents} centavos"
                    }
                }

                balanceResult.onFailure { error ->
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
        binding.btnRead.isEnabled = !loading
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
