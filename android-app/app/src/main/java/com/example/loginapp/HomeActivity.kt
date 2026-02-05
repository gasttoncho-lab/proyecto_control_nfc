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
    
    private fun loadUserData() {
        val user = authRepository.getSavedUser()
        user?.let {
            binding.tvWelcome.text = "¡Bienvenido!"
            binding.tvUserName.text = it.name
            binding.tvUserEmail.text = it.email
        }
    }
    
    private fun setupListeners() {
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
