package com.example.loginapp

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.loginapp.data.model.Event
import com.example.loginapp.data.repository.AuthRepository
import com.example.loginapp.data.repository.OperationsRepository
import com.example.loginapp.databinding.ActivityEventSelectBinding
import kotlinx.coroutines.launch

class EventSelectActivity : AppCompatActivity() {

    private lateinit var binding: ActivityEventSelectBinding
    private lateinit var authRepository: AuthRepository
    private lateinit var operationsRepository: OperationsRepository
    private var events: List<Event> = emptyList()
    private var selectedEvent: Event? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityEventSelectBinding.inflate(layoutInflater)
        setContentView(binding.root)

        authRepository = AuthRepository(this)
        operationsRepository = OperationsRepository(authRepository)

        setupListeners()
        loadEvents()
    }

    private fun setupListeners() {
        binding.btnTopup.setOnClickListener {
            val event = selectedEvent ?: return@setOnClickListener
            val intent = Intent(this, TopupActivity::class.java)
            intent.putExtra(TopupActivity.EXTRA_EVENT_ID, event.id)
            intent.putExtra(TopupActivity.EXTRA_EVENT_NAME, event.name)
            startActivity(intent)
        }

        binding.btnBalance.setOnClickListener {
            val event = selectedEvent ?: return@setOnClickListener
            val intent = Intent(this, BalanceActivity::class.java)
            intent.putExtra(BalanceActivity.EXTRA_EVENT_ID, event.id)
            intent.putExtra(BalanceActivity.EXTRA_EVENT_NAME, event.name)
            startActivity(intent)
        }

        binding.btnLogout.setOnClickListener {
            authRepository.logout()
            val intent = Intent(this, MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }
    }

    private fun loadEvents() {
        setLoading(true)
        lifecycleScope.launch {
            val result = operationsRepository.getOpenEvents()
            setLoading(false)

            result.onSuccess { list ->
                events = list
                val labels = list.map { "${it.name} (${it.status})" }
                binding.listEvents.adapter = ArrayAdapter(this@EventSelectActivity, android.R.layout.simple_list_item_1, labels)
                binding.listEvents.setOnItemClickListener { _, _, position, _ ->
                    selectedEvent = events[position]
                    authRepository.saveSelectedEvent(events[position].id, events[position].name)
                    binding.tvSelectedEvent.text = "Evento seleccionado: ${events[position].name}"
                    binding.btnTopup.isEnabled = true
                    binding.btnBalance.isEnabled = true
                }
            }

            result.onFailure { error ->
                if (error.message == "UNAUTHORIZED") {
                    handleUnauthorized()
                } else {
                    Toast.makeText(this@EventSelectActivity, "Error al cargar eventos", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        binding.btnTopup.isEnabled = !loading && selectedEvent != null
        binding.btnBalance.isEnabled = !loading && selectedEvent != null
    }

    private fun handleUnauthorized() {
        authRepository.logout()
        val intent = Intent(this, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
