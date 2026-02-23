package com.example.loginapp

import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.loginapp.data.model.ReplaceFinishRequest
import com.example.loginapp.data.model.ReplaceStartRequest
import com.example.loginapp.data.repository.AuthRepository
import com.example.loginapp.data.repository.DeviceRepository
import com.example.loginapp.data.repository.OperationsRepository
import com.example.loginapp.databinding.ActivityReplaceBinding
import com.example.loginapp.nfc.NfcUtils
import com.example.loginapp.util.CentsFormat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ReplaceActivity : AppCompatActivity(), NfcAdapter.ReaderCallback {

    enum class ReplaceState {
        INIT,
        WAIT_NEW_TAG,
        FINISHING,
        DONE,
    }

    private lateinit var binding: ActivityReplaceBinding
    private lateinit var authRepository: AuthRepository
    private lateinit var deviceRepository: DeviceRepository
    private lateinit var operationsRepository: OperationsRepository
    private var nfcAdapter: NfcAdapter? = null

    private val prefs by lazy { getSharedPreferences("replace_flow", MODE_PRIVATE) }

    private var state: ReplaceState = ReplaceState.INIT
    private var replaceSessionId: String? = null
    private var newWristbandId: String? = null

    private var eventId: String = ""
    private var oldWristbandId: String = ""
    private var balanceCents: Int = 0

    private var lastUidHex: String? = null
    private var lastUidTimestamp: Long = 0L
    private var alreadySubmitting = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityReplaceBinding.inflate(layoutInflater)
        setContentView(binding.root)

        authRepository = AuthRepository(this)
        deviceRepository = DeviceRepository(this)
        operationsRepository = OperationsRepository(authRepository, deviceRepository)
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        eventId = intent.getStringExtra(EXTRA_EVENT_ID).orEmpty()
        oldWristbandId = intent.getStringExtra(EXTRA_OLD_WRISTBAND_ID).orEmpty()
        balanceCents = intent.getIntExtra(EXTRA_BALANCE_CENTS, 0)
        val incomingReason = intent.getStringExtra(EXTRA_REASON)

        if (eventId.isBlank() || oldWristbandId.isBlank()) {
            Toast.makeText(this, "Faltan datos para reemplazo", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        if (nfcAdapter == null) {
            Toast.makeText(this, "NFC no disponible", Toast.LENGTH_LONG).show()
        }

        restoreState(savedInstanceState)
        if (!incomingReason.isNullOrBlank()) {
            when {
                incomingReason.contains("dañ", true) -> binding.rgReason.check(binding.rbDamaged.id)
                incomingReason.contains("otro", true) -> {
                    binding.rgReason.check(binding.rbOther.id)
                    binding.etOtherReason.setText(incomingReason)
                }
                else -> binding.rgReason.check(binding.rbBehind.id)
            }
        }

        binding.tvOldWristband.text = truncateId(oldWristbandId)
        binding.tvBalance.text = CentsFormat.show(balanceCents.toLong())

        binding.rgReason.setOnCheckedChangeListener { _, checkedId ->
            binding.etOtherReason.visibility = if (checkedId == binding.rbOther.id) View.VISIBLE else View.GONE
        }

        binding.btnStartReplace.setOnClickListener { startReplace() }
        binding.btnBack.setOnClickListener { finish() }

        renderState()
    }

    override fun onResume() {
        super.onResume()
        if (state == ReplaceState.WAIT_NEW_TAG) {
            enableReader()
        } else {
            disableReader()
        }
    }

    override fun onPause() {
        super.onPause()
        disableReader()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString("replaceState", state.name)
        outState.putString("replaceSessionId", replaceSessionId)
        outState.putString("newWristbandId", newWristbandId)
    }

    override fun onTagDiscovered(tag: Tag) {
        if (state != ReplaceState.WAIT_NEW_TAG) return
        if (alreadySubmitting) return

        val uidHex = NfcUtils.uidHex(tag)
        val now = System.currentTimeMillis()
        if (uidHex == lastUidHex && (now - lastUidTimestamp) < 1000) return
        lastUidHex = uidHex
        lastUidTimestamp = now

        val sessionId = replaceSessionId ?: return
        alreadySubmitting = true
        state = ReplaceState.FINISHING
        runOnUiThread { renderState() }

        lifecycleScope.launch(Dispatchers.IO) {
            val result = operationsRepository.replaceFinish(ReplaceFinishRequest(sessionId, uidHex))
            result.onSuccess { response ->
                newWristbandId = response.newWristbandId
                balanceCents = response.transferredCents
                state = ReplaceState.DONE
                clearPersistedState()
                alreadySubmitting = false
                runOnUiThread { renderState() }
            }
            result.onFailure { error ->
                alreadySubmitting = false
                state = ReplaceState.WAIT_NEW_TAG
                runOnUiThread {
                    renderState()
                    binding.tvStatus.text = "Error reemplazo: ${error.message ?: "desconocido"}"
                }
            }
        }
    }

    private fun startReplace() {
        val reason = when (binding.rgReason.checkedRadioButtonId) {
            binding.rbDamaged.id -> "Pulsera dañada"
            binding.rbOther.id -> {
                val custom = binding.etOtherReason.text?.toString()?.trim().orEmpty()
                if (custom.isBlank()) "Otro" else "Otro: $custom"
            }
            else -> "TAG atrasado"
        }

        state = ReplaceState.FINISHING
        renderState()

        lifecycleScope.launch(Dispatchers.IO) {
            val result = operationsRepository.replaceStart(ReplaceStartRequest(eventId, oldWristbandId, reason))
            result.onSuccess { response ->
                replaceSessionId = response.replaceSessionId
                balanceCents = response.balanceCents
                persistState()
                state = ReplaceState.WAIT_NEW_TAG
                runOnUiThread { renderState() }
            }
            result.onFailure { error ->
                state = ReplaceState.INIT
                runOnUiThread {
                    renderState()
                    binding.tvStatus.text = "Error iniciando reemplazo: ${error.message ?: "desconocido"}"
                }
            }
        }
    }

    private fun renderState() {
        binding.layoutInit.visibility = if (state == ReplaceState.INIT) View.VISIBLE else View.GONE
        binding.layoutWaitTag.visibility = if (state == ReplaceState.WAIT_NEW_TAG) View.VISIBLE else View.GONE
        binding.layoutDone.visibility = if (state == ReplaceState.DONE) View.VISIBLE else View.GONE
        binding.progressBar.visibility = if (state == ReplaceState.FINISHING) View.VISIBLE else View.GONE

        when (state) {
            ReplaceState.INIT -> {
                binding.tvStatus.text = "Configurar reemplazo"
                disableReader()
            }
            ReplaceState.WAIT_NEW_TAG -> {
                binding.tvStatus.text = "Acerque pulsera NUEVA"
                binding.tvBalance.text = CentsFormat.show(balanceCents.toLong())
                enableReader()
            }
            ReplaceState.FINISHING -> {
                binding.tvStatus.text = "Procesando..."
                disableReader()
            }
            ReplaceState.DONE -> {
                binding.tvStatus.text = "Reemplazo OK"
                binding.tvNewWristband.text = truncateId(newWristbandId)
                binding.tvTransferred.text = CentsFormat.show(balanceCents.toLong())
                disableReader()
            }
        }
    }

    private fun enableReader() {
        nfcAdapter?.enableReaderMode(
            this,
            this,
            NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
            null
        )
    }

    private fun disableReader() {
        nfcAdapter?.disableReaderMode(this)
    }

    private fun persistState() {
        prefs.edit()
            .putString("replaceState", state.name)
            .putString("replaceSessionId", replaceSessionId)
            .putString("newWristbandId", newWristbandId)
            .putString("eventId", eventId)
            .putString("oldWristbandId", oldWristbandId)
            .putInt("balanceCents", balanceCents)
            .apply()
    }

    private fun clearPersistedState() {
        prefs.edit().clear().apply()
    }

    private fun restoreState(savedInstanceState: Bundle?) {
        replaceSessionId = savedInstanceState?.getString("replaceSessionId") ?: prefs.getString("replaceSessionId", null)
        newWristbandId = savedInstanceState?.getString("newWristbandId") ?: prefs.getString("newWristbandId", null)

        eventId = prefs.getString("eventId", eventId) ?: eventId
        oldWristbandId = prefs.getString("oldWristbandId", oldWristbandId) ?: oldWristbandId
        balanceCents = prefs.getInt("balanceCents", balanceCents)

        val restoredState = savedInstanceState?.getString("replaceState")
            ?: prefs.getString("replaceState", ReplaceState.INIT.name)
        state = runCatching { ReplaceState.valueOf(restoredState ?: ReplaceState.INIT.name) }
            .getOrElse { ReplaceState.INIT }

        if (state == ReplaceState.FINISHING) {
            state = if (!replaceSessionId.isNullOrBlank()) ReplaceState.WAIT_NEW_TAG else ReplaceState.INIT
        }
    }

    private fun truncateId(value: String?): String {
        if (value.isNullOrBlank()) return "-"
        return if (value.length <= 13) value else "${value.take(8)}…${value.takeLast(4)}"
    }

    companion object {
        const val EXTRA_EVENT_ID = "extra_event_id"
        const val EXTRA_OLD_WRISTBAND_ID = "extra_old_wristband_id"
        const val EXTRA_BALANCE_CENTS = "extra_balance_cents"
        const val EXTRA_REASON = "extra_reason"

        fun createIntent(
            activity: AppCompatActivity,
            eventId: String,
            oldWristbandId: String,
            balanceCents: Int,
            reason: String? = null,
        ): Intent {
            return Intent(activity, ReplaceActivity::class.java)
                .putExtra(EXTRA_EVENT_ID, eventId)
                .putExtra(EXTRA_OLD_WRISTBAND_ID, oldWristbandId)
                .putExtra(EXTRA_BALANCE_CENTS, balanceCents)
                .putExtra(EXTRA_REASON, reason)
        }
    }
}
