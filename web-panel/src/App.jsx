import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { API_URL } from './api.js'
import Dashboard from './components/Dashboard/index.jsx'

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      })
      onLogin(response.data.access_token, response.data.refresh_token)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🔐 Panel de Administración</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@dominio.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      setToken(savedToken)
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleLogin = (newToken, refreshToken) => {
    localStorage.setItem('token', newToken)
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
    setToken(newToken)
    setIsAuthenticated(true)
  }

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try { await axios.post(`${API_URL}/auth/logout`, { refresh_token: refreshToken }) } catch (_) {}
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    setToken(null)
    setIsAuthenticated(false)
  }

  if (loading) {
    return <div className="loading">Cargando...</div>
  }

  return (
    <div className="app">
      {isAuthenticated ? (
        <Dashboard token={token} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  )
}

export default App
