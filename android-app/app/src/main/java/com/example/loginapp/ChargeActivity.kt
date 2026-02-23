package com.example.loginapp

import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.loginapp.data.model.ChargeCommitRequest
import com.example.loginapp.data.model.ChargeItemDto
import com.example.loginapp.data.model.ChargePrepareRequest
import com.example.loginapp.data.model.BalanceCheckRequest
import com.example.loginapp.data.model.DeviceSessionResponse
import com.example.loginapp.data.model.ProductDto
import com.example.loginapp.data.repository.AuthRepository
import com.example.loginapp.data.repository.DeviceRepository
import com.example.loginapp.data.repository.OperationsRepository
import com.example.loginapp.databinding.ActivityChargeBinding
import com.example.loginapp.databinding.DialogChargeResultBinding
import com.example.loginapp.nfc.NfcUtils
import com.example.loginapp.util.CentsFormat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.net.SocketTimeoutException
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID

class ChargeActivity : AppCompatActivity(), NfcAdapter.ReaderCallback {

    enum class PendingPhase {
        NONE,
        COMMIT_PENDING,
    }

    enum class ChargeState {
        IDLE,
        ARMING,
        PROCESSING,
        RESULT
    }

    private lateinit var binding: ActivityChargeBinding
    private lateinit var authRepository: AuthRepository
    private lateinit var deviceRepository: DeviceRepository
    private lateinit var operationsRepository: OperationsRepository
    private lateinit var adapter: ChargeProductAdapter

    private var state: ChargeState = ChargeState.IDLE
    private var canOperate = false
    private var pendingTransactionId: String? = null
    private var pendingPhase: PendingPhase = PendingPhase.NONE
    private var nfcAdapter: NfcAdapter? = null

    private var lastUidHex: String? = null
    private var lastUidTimestamp: Long = 0L

    private var session: DeviceSessionResponse? = null
    private val products = mutableListOf<ChargeProductItem>()

    private val timeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
        .withLocale(Locale("es", "MX"))
        .withZone(ZoneId.systemDefault())

    private val prefs by lazy { getSharedPreferences("charge_flow", MODE_PRIVATE) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChargeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        authRepository = AuthRepository(this)
        deviceRepository = DeviceRepository(this)
        operationsRepository = OperationsRepository(authRepository, deviceRepository)
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        adapter = ChargeProductAdapter(
            onIncrease = { item ->
                item.quantity += 1
                updateTotal()
                adapter.notifyDataSetChanged()
            },
            onDecrease = { item ->
                if (item.quantity > 0) {
                    item.quantity -= 1
                    updateTotal()
                    adapter.notifyDataSetChanged()
                }
            },
        )

        binding.recyclerProducts.layoutManager = LinearLayoutManager(this)
        binding.recyclerProducts.adapter = adapter

        binding.btnCharge.setOnClickListener {
            if (state == ChargeState.IDLE) {
                if (!canOperate) {
                    binding.tvStatus.text = "Dispositivo no autorizado o evento cerrado"
                    return@setOnClickListener
                }
                if (totalCents() <= 0L) {
                    binding.tvStatus.text = "Seleccione productos antes de cobrar"
                    return@setOnClickListener
                }
                state = ChargeState.ARMING
                binding.tvStatus.text = "ARMING: acerque la pulsera"
                updateUiForState()
            }
        }

        binding.btnCancel.setOnClickListener {
            if (state == ChargeState.ARMING) {
                state = ChargeState.IDLE
                binding.tvStatus.text = "Operación cancelada"
                updateUiForState()
            }
        }

        binding.btnClear.setOnClickListener {
            resetCart()
            binding.tvStatus.text = "Carrito limpio"
        }

        binding.etSearch.addTextChangedListener(SimpleTextWatcher { query ->
            filterProducts(query)
        })

        if (nfcAdapter == null) {
            Toast.makeText(this, "NFC no disponible en este dispositivo", Toast.LENGTH_LONG).show()
            binding.btnCharge.isEnabled = false
        }

        restorePendingState(savedInstanceState)

        refreshSession()
        updateTotal()
        updateUiForState()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString("pendingTransactionId", pendingTransactionId)
        outState.putString("pendingPhase", pendingPhase.name)
        outState.putString("chargeState", state.name)
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
            runOnUiThread { binding.tvStatus.text = "Dispositivo no autorizado o evento cerrado" }
            return
        }
        if (state != ChargeState.ARMING) return

        if (totalCents() <= 0L) {
            runOnUiThread { binding.tvStatus.text = "Seleccione productos antes de cobrar" }
            return
        }

        val uidHex = NfcUtils.uidHex(tag)
        val now = System.currentTimeMillis()
        if (uidHex == lastUidHex && (now - lastUidTimestamp) < 1000) return
        lastUidHex = uidHex
        lastUidTimestamp = now

        state = ChargeState.PROCESSING
        runOnUiThread {
            binding.tvStatus.text = "Procesando cobro..."
            updateUiForState()
        }

        lifecycleScope.launch(Dispatchers.IO) {
            var transactionId: String? = null
            try {
                if (pendingPhase == PendingPhase.COMMIT_PENDING && !pendingTransactionId.isNullOrBlank()) {
                    transactionId = pendingTransactionId
                    val commitResult = operationsRepository.chargeCommit(ChargeCommitRequest(transactionId!!))
                    commitResult.onSuccess { commitResponse ->
                        clearPendingState()
                        handleCommitResponse(
                            status = commitResponse.status,
                            totalCents = commitResponse.totalCents,
                            reason = commitResponse.reason,
                            uidHex = "",
                            tagIdHex = "",
                            ctr = 0,
                            sigHex = ""
                        )
                    }
                    commitResult.onFailure { error ->
                        handleCommitError(error, transactionId)
                    }
                    return@launch
                }

                val payload = NfcUtils.readPayload(tag)
                transactionId = pendingTransactionId ?: UUID.randomUUID().toString()
                val items = products.filter { it.quantity > 0 }
                    .map { ChargeItemDto(productId = it.id, qty = it.quantity) }

                val prepareResult = operationsRepository.chargePrepare(
                    ChargePrepareRequest(
                        transactionId = transactionId,
                        uidHex = uidHex,
                        tagIdHex = payload.tagIdHex,
                        ctr = payload.ctr,
                        sigHex = payload.sigHex,
                        items = items
                    )
                )

                prepareResult.onSuccess { response ->
                    if (response.status == "PENDING") {
                        val ctrNew = response.ctrNew ?: payload.ctr
                        val sigNew = response.sigNewHex ?: payload.sigHex
                        NfcUtils.writePayload(tag, payload.tagIdHex, ctrNew, sigNew)
                        setPendingState(transactionId, PendingPhase.COMMIT_PENDING)

                        val commitResult = operationsRepository.chargeCommit(ChargeCommitRequest(transactionId))
                        commitResult.onSuccess { commitResponse ->
                            clearPendingState()
                            handleCommitResponse(
                                status = commitResponse.status,
                                totalCents = commitResponse.totalCents,
                                reason = commitResponse.reason,
                                uidHex = uidHex,
                                tagIdHex = payload.tagIdHex,
                                ctr = ctrNew,
                                sigHex = sigNew
                            )
                        }
                        commitResult.onFailure { error ->
                            handleCommitError(error, transactionId)
                        }
                    } else {
                        clearPendingState()
                        showResultDialog(
                            status = "DECLINED",
                            totalCents = response.totalCents,
                            reason = response.reason
                        )
                    }
                }

                prepareResult.onFailure { error ->
                    handleChargeError(error, transactionId)
                }
            } catch (ex: Exception) {
                handleChargeError(ex, transactionId)
            }
        }
    }

    private fun handleCommitResponse(
        status: String,
        totalCents: Int,
        reason: String?,
        uidHex: String,
        tagIdHex: String,
        ctr: Int,
        sigHex: String,
    ) {
        if (status == "APPROVED") {
            if (uidHex.isBlank() || tagIdHex.isBlank() || sigHex.isBlank()) {
                showResultDialog(
                    status = "APPROVED",
                    totalCents = totalCents,
                    reason = null,
                    remainingCents = "(no disponible)"
                )
                return
            }
            // balanceCheck() es suspend → debe ejecutarse dentro de coroutine
            lifecycleScope.launch {
                runCatching {
                    operationsRepository.balanceCheck(
                        BalanceCheckRequest(
                            transactionId = UUID.randomUUID().toString(),
                            uidHex = uidHex,
                            tagIdHex = tagIdHex,
                            ctr = ctr,
                            sigHex = sigHex
                        )
                    )
                }.onSuccess { balanceResult ->
                    balanceResult.onSuccess { response ->
                        showResultDialog(
                            status = "APPROVED",
                            totalCents = totalCents,
                            reason = null,
                            remainingCents = response.balanceCents.toString()
                        )
                    }
                    balanceResult.onFailure {
                        showResultDialog(
                            status = "APPROVED",
                            totalCents = totalCents,
                            reason = null,
                            remainingCents = "(no disponible)"
                        )
                    }
                }.onFailure {
                    showResultDialog(
                        status = "APPROVED",
                        totalCents = totalCents,
                        reason = null,
                        remainingCents = "(no disponible)"
                    )
                }
            }
        } else {
            showResultDialog(status = "DECLINED", totalCents = totalCents, reason = reason)
        }
    }

    private fun handleChargeError(error: Throwable?, transactionId: String?) {
        runOnUiThread {
            if (error?.message == "UNAUTHORIZED") {
                authRepository.logout()
                val intent = Intent(this, MainActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
                return@runOnUiThread
            }

            if (error is SocketTimeoutException) {
                binding.tvStatus.text = "NETWORK_TIMEOUT: reintente con la misma pulsera"
                state = ChargeState.ARMING
                updateUiForState()
                return@runOnUiThread
            }

            maybeOfferReplacement(error)
            clearPendingState()
            val friendlyMessage = mapErrorMessage(error?.message)
            binding.tvStatus.text = "Error: $friendlyMessage"
            state = ChargeState.IDLE
            updateUiForState()
        }
    }

    private fun handleCommitError(error: Throwable?, transactionId: String?) {
        runOnUiThread {
            if (error?.message == "UNAUTHORIZED") {
                authRepository.logout()
                val intent = Intent(this, MainActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
                return@runOnUiThread
            }

            if (error is SocketTimeoutException) {
                setPendingState(transactionId, PendingPhase.COMMIT_PENDING)
                binding.tvStatus.text = "NETWORK_TIMEOUT: reintente commit con la misma pulsera"
                state = ChargeState.ARMING
                updateUiForState()
                return@runOnUiThread
            }

            if (error?.message == "CTR_FORWARD_JUMP" || error?.message == "CTR_RESYNC_DONE_RETRY") {
                clearPendingState()
                binding.tvStatus.text = "Pulsera desincronizada, pasar de nuevo"
                state = ChargeState.ARMING
                updateUiForState()
                return@runOnUiThread
            }

            maybeOfferReplacement(error)
            clearPendingState()
            val friendlyMessage = mapErrorMessage(error?.message)
            binding.tvStatus.text = "Error: $friendlyMessage"
            state = ChargeState.IDLE
            updateUiForState()
        }
    }

    private fun showResultDialog(
        status: String,
        totalCents: Int,
        reason: String?,
        remainingCents: String? = null,
    ) {
        runOnUiThread {
            state = ChargeState.RESULT
            updateUiForState()

            val dialogBinding = DialogChargeResultBinding.inflate(layoutInflater)
            dialogBinding.tvResultStatus.text = status
            dialogBinding.tvResultTotal.text = "Total cobrado: ${totalCents.toString()}"
            dialogBinding.tvResultTotalCents.text = totalCents.toString()
            dialogBinding.tvResultBooth.text = "Booth: ${session?.booth?.name ?: "-"}"
            dialogBinding.tvResultTimestamp.text = "Hora: ${timeFormatter.format(Instant.now())}"
            dialogBinding.tvResultReason.text = reason?.let { "Motivo: ${mapErrorMessage(it)}" } ?: ""
            if (status == "APPROVED") {
                dialogBinding.tvRemainingCents.visibility = View.VISIBLE
                dialogBinding.tvRemainingCents.text = "Saldo restante: ${remainingCents ?: "(no disponible)"}"
            } else {
                dialogBinding.tvRemainingCents.visibility = View.GONE
            }

            val dialog = AlertDialog.Builder(this)
                .setView(dialogBinding.root)
                .setCancelable(false)
                .create()

            dialogBinding.btnResultOk.setOnClickListener {
                dialog.dismiss()
                if (status == "APPROVED") {
                    resetCart()
                }
                clearPendingState()
                state = ChargeState.IDLE
                binding.tvStatus.text = "Listo para cobrar"
                updateUiForState()
            }

            dialog.show()
        }
    }

    private fun refreshSession() {
        lifecycleScope.launch {
            val result = operationsRepository.getDeviceSession()
            result.onSuccess { sessionResponse ->
                session = sessionResponse
                if (!sessionResponse.authorized) {
                    binding.tvHeaderEvent.text = "Evento: -"
                    binding.tvHeaderBooth.text = "Booth: -"
                    binding.tvHeaderMode.text = "Modo: -"
                    binding.tvStatus.text = "Dispositivo no autorizado"
                    canOperate = false
                    updateUiForState()
                    return@onSuccess
                }

                val eventName = sessionResponse.event?.name ?: "-"
                val eventStatus = sessionResponse.event?.status ?: "-"
                val boothName = sessionResponse.booth?.name ?: "-"
                val mode = sessionResponse.device?.mode ?: "-"

                binding.tvHeaderEvent.text = "Evento: $eventName ($eventStatus)"
                binding.tvHeaderBooth.text = "Booth: $boothName"
                binding.tvHeaderMode.text = "Modo: $mode"

                canOperate = sessionResponse.device?.mode == "CHARGE" && sessionResponse.event?.status == "OPEN"

                if (sessionResponse.device?.mode == "CHARGE") {
                    loadProductsIfNeeded()
                }

                updateUiForState()
            }

            result.onFailure { error ->
                if (error.message == "UNAUTHORIZED") {
                    authRepository.logout()
                    val intent = Intent(this@ChargeActivity, MainActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    startActivity(intent)
                    finish()
                } else {
                    binding.tvStatus.text = "No se pudo cargar sesión"
                    canOperate = false
                    updateUiForState()
                }
            }
        }
    }

    private fun loadProductsIfNeeded() {
        if (products.isNotEmpty()) {
            filterProducts(binding.etSearch.text?.toString().orEmpty())
            return
        }

        lifecycleScope.launch {
            val result = operationsRepository.getCatalogProducts()
            result.onSuccess { productList ->
                applyProducts(productList)
            }
            result.onFailure { error ->
                binding.tvStatus.text = "No se pudieron cargar productos: ${error.message}"
            }
        }
    }

    private fun applyProducts(productList: List<ProductDto>) {
        products.clear()
        products.addAll(
            productList.filter { it.isActive }.map {
                ChargeProductItem(
                    id = it.id,
                    name = it.name,
                    priceCents = it.priceCents,
                    quantity = 0
                )
            }
        )
        filterProducts(binding.etSearch.text?.toString().orEmpty())
    }

    private fun filterProducts(query: String) {
        val normalized = query.trim().lowercase(Locale.getDefault())
        val filtered = if (normalized.isEmpty()) {
            products
        } else {
            products.filter { it.name.lowercase(Locale.getDefault()).contains(normalized) }
        }
        adapter.submitItems(filtered)
    }

    private fun updateTotal() {
        val total = totalCents()
        binding.tvTotalAmount.text = CentsFormat.show(total)
        binding.btnCharge.isEnabled = total > 0L && canOperate && state == ChargeState.IDLE
    }

    private fun totalCents(): Long =
        products.sumOf { it.priceCents.toLong() * it.quantity.toLong() }

    private fun resetCart() {
        products.forEach { it.quantity = 0 }
        filterProducts(binding.etSearch.text?.toString().orEmpty())
        updateTotal()
    }

    private fun updateUiForState() {
        val isIdle = state == ChargeState.IDLE
        val isArming = state == ChargeState.ARMING
        val isProcessing = state == ChargeState.PROCESSING

        adapter.isLocked = !isIdle
        binding.recyclerProducts.isEnabled = isIdle
        binding.etSearch.isEnabled = isIdle
        binding.btnClear.isEnabled = isIdle && canOperate
        binding.btnCharge.isEnabled = isIdle && canOperate && totalCents() > 0L
        binding.btnCancel.isEnabled = isArming
        binding.progressBar.visibility = if (isProcessing) View.VISIBLE else View.GONE

        binding.btnCharge.text = if (isIdle) "Cobrar" else "Cobrar"

        updateTotal()
    }

    private fun mapErrorMessage(message: String?): String {
        return when (message) {
            "DEVICE_NOT_AUTHORIZED" -> "Dispositivo no autorizado"
            "EVENT_CLOSED" -> "Evento cerrado"
            "WRISTBAND_BLOCKED" -> "Pulsera bloqueada"
            "INVALID_SIGNATURE" -> "Firma inválida"
            "CTR_REPLAY" -> "Contador repetido"
            "WRISTBAND_REPLACE_REQUIRED" -> "Pulsera atrasada. Reemplazo requerido"
            "CTR_FORWARD_JUMP" -> "Pulsera desincronizada, pasar de nuevo"
            "CTR_RESYNC_DONE_RETRY" -> "Pulsera desincronizada, pasar de nuevo"
            "CTR_TAMPER" -> "Contador adulterado"
            "INSUFFICIENT_FUNDS" -> "Saldo insuficiente"
            "TX_CONFLICT" -> "Transacción en conflicto"
            "BOOTH_NOT_ASSIGNED" -> "Booth no asignado"
            "INVALID_PRODUCT" -> "Producto inválido"
            "NETWORK_TIMEOUT" -> "Timeout de red"
            null -> "Error desconocido"
            else -> message
        }
    }


    private fun maybeOfferReplacement(error: Throwable?) {
        val apiError = error as? OperationsRepository.ApiHttpException ?: return

        val shouldOffer = apiError.code == "WRISTBAND_REPLACE_REQUIRED" ||
            (apiError.code == "CTR_REPLAY" &&
                (apiError.details["tagCtr"]?.toIntOrNull() ?: Int.MAX_VALUE) <
                (apiError.details["serverCtr"]?.toIntOrNull() ?: Int.MIN_VALUE))
        if (!shouldOffer) return

        val balanceCents = apiError.details["balanceCents"]?.toIntOrNull() ?: 0
        val oldWristbandId = apiError.details["wristbandId"] ?: return
        val eventId = apiError.details["eventId"] ?: session?.event?.id ?: return

        runOnUiThread {
            AlertDialog.Builder(this)
                .setTitle("Reemplazo requerido")
                .setMessage("Pulsera atrasada. Reemplazo requerido. Saldo: ${CentsFormat.show(balanceCents.toLong())}")
                .setPositiveButton("Reemplazar pulsera") { _, _ ->
                    val intent = ReplaceActivity.createIntent(
                        this,
                        eventId = eventId,
                        oldWristbandId = oldWristbandId,
                        balanceCents = balanceCents,
                        reason = "TAG atrasado"
                    )
                    startActivity(intent)
                }
                .setNegativeButton("Cancelar", null)
                .show()
        }
    }

    private fun setPendingState(transactionId: String?, phase: PendingPhase) {
        pendingTransactionId = transactionId
        pendingPhase = if (transactionId.isNullOrBlank()) PendingPhase.NONE else phase
        prefs.edit()
            .putString("pendingTransactionId", pendingTransactionId)
            .putString("pendingPhase", pendingPhase.name)
                        .apply()
    }

    private fun clearPendingState() {
        pendingTransactionId = null
        pendingPhase = PendingPhase.NONE
        prefs.edit().remove("pendingTransactionId").remove("pendingPhase").apply()
    }

    private fun restorePendingState(savedInstanceState: Bundle?) {
        pendingTransactionId = savedInstanceState?.getString("pendingTransactionId")
            ?: prefs.getString("pendingTransactionId", null)
        val restoredPhase = savedInstanceState?.getString("pendingPhase")
            ?: prefs.getString("pendingPhase", PendingPhase.NONE.name)
        pendingPhase = runCatching { PendingPhase.valueOf(restoredPhase ?: PendingPhase.NONE.name) }
            .getOrElse { PendingPhase.NONE }

        val restoredState = savedInstanceState?.getString("chargeState")
        if (!restoredState.isNullOrBlank()) {
            state = runCatching { ChargeState.valueOf(restoredState) }.getOrElse { ChargeState.IDLE }
        }
        if (pendingPhase == PendingPhase.COMMIT_PENDING && !pendingTransactionId.isNullOrBlank()) {
            state = ChargeState.ARMING
            binding.tvStatus.text = "Commit pendiente, acerque la pulsera para reintentar"
        }
    }
}
