package com.example.loginapp

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.loginapp.data.repository.AuthRepository
import com.example.loginapp.databinding.ActivityMainBinding
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var authRepository: AuthRepository
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        authRepository = AuthRepository(this)
        
        // Verificar si ya hay sesión activa
        if (authRepository.isLoggedIn()) {
            navigateToEventSelect()
            return
        }
        
        setupListeners()
    }
    
    private fun setupListeners() {
        binding.btnLogin.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            val password = binding.etPassword.text.toString().trim()
            
            if (validateInput(email, password)) {
                performLogin(email, password)
            }
        }
    }
    
    private fun validateInput(email: String, password: String): Boolean {
        if (email.isEmpty()) {
            binding.etEmail.error = "El email es requerido"
            return false
        }
        
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            binding.etEmail.error = "Email inválido"
            return false
        }
        
        if (password.isEmpty()) {
            binding.etPassword.error = "La contraseña es requerida"
            return false
        }
        
        if (password.length < 6) {
            binding.etPassword.error = "La contraseña debe tener al menos 6 caracteres"
            return false
        }
        
        return true
    }
    
    private fun performLogin(email: String, password: String) {
        showLoading(true)
        
        lifecycleScope.launch {
            val result = authRepository.login(email, password)
            
            showLoading(false)
            
            result.onSuccess { loginResponse ->
                Toast.makeText(
                    this@MainActivity,
                    "¡Bienvenido ${loginResponse.user.name}!",
                    Toast.LENGTH_SHORT
                ).show()
                navigateToEventSelect()
            }
            
            result.onFailure { error ->
                Toast.makeText(
                    this@MainActivity,
                    "Error: ${error.message}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }
    
    private fun showLoading(show: Boolean) {
        binding.progressBar.visibility = if (show) View.VISIBLE else View.GONE
        binding.btnLogin.isEnabled = !show
        binding.etEmail.isEnabled = !show
        binding.etPassword.isEnabled = !show
    }
    
    private fun navigateToEventSelect() {
        val intent = Intent(this, EventSelectActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
