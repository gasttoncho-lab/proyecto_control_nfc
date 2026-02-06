package com.example.loginapp

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.example.loginapp.data.repository.AuthRepository
import com.example.loginapp.databinding.ActivityHomeBinding

class HomeActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityHomeBinding
    private lateinit var authRepository: AuthRepository
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        authRepository = AuthRepository(this)
        
        loadUserData()
        setupListeners()
    }

    override fun onResume() {
        super.onResume()
        loadUserData()
    }
    
    private fun loadUserData() {
        val user = authRepository.getSavedUser()
        user?.let {
            binding.tvWelcome.text = "¡Bienvenido!"
            binding.tvUserName.text = it.name
            binding.tvUserEmail.text = it.email
        }

        val selectedEventName = authRepository.getSelectedEventName()
        binding.tvSelectedEvent.text = "Evento seleccionado: ${selectedEventName ?: "-"}"
    }
    
    private fun setupListeners() {
        binding.btnSelectEvent.setOnClickListener {
            val intent = Intent(this, EventSelectActivity::class.java)
            startActivity(intent)
        }

        binding.btnTopup.setOnClickListener {
            val eventId = authRepository.getSelectedEventId()
            val eventName = authRepository.getSelectedEventName()
            if (eventId.isNullOrEmpty() || eventName.isNullOrEmpty()) {
                val intent = Intent(this, EventSelectActivity::class.java)
                startActivity(intent)
                return@setOnClickListener
            }
            val intent = Intent(this, TopupActivity::class.java)
            intent.putExtra(TopupActivity.EXTRA_EVENT_ID, eventId)
            intent.putExtra(TopupActivity.EXTRA_EVENT_NAME, eventName)
            startActivity(intent)
        }

        binding.btnBalance.setOnClickListener {
            val eventId = authRepository.getSelectedEventId()
            val eventName = authRepository.getSelectedEventName()
            if (eventId.isNullOrEmpty() || eventName.isNullOrEmpty()) {
                val intent = Intent(this, EventSelectActivity::class.java)
                startActivity(intent)
                return@setOnClickListener
            }
            val intent = Intent(this, BalanceActivity::class.java)
            intent.putExtra(BalanceActivity.EXTRA_EVENT_ID, eventId)
            intent.putExtra(BalanceActivity.EXTRA_EVENT_NAME, eventName)
            startActivity(intent)
        }

        binding.btnLogout.setOnClickListener {
            performLogout()
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
