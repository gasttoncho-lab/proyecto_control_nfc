import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:3000'

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

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
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
      onLogin(response.data.access_token)
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
              placeholder="admin@example.com"
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
        <p style={{ marginTop: '20px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
          Usuario por defecto: admin@example.com / admin123
        </p>
      </div>
    </div>
  )
}

function Dashboard({ token, onLogout }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUsers(response.data)
    } catch (err) {
      setError('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setShowModal(true)
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setShowModal(true)
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return

    try {
      await axios.delete(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSuccess('Usuario eliminado correctamente')
      setTimeout(() => setSuccess(''), 3000)
      fetchUsers()
    } catch (err) {
      setError('Error al eliminar usuario')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleSaveUser = async (userData) => {
    try {
      if (editingUser) {
        await axios.put(`${API_URL}/users/${editingUser.id}`, userData, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setSuccess('Usuario actualizado correctamente')
      } else {
        await axios.post(`${API_URL}/users`, userData, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setSuccess('Usuario creado correctamente')
      }
      setTimeout(() => setSuccess(''), 3000)
      setShowModal(false)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar usuario')
      setTimeout(() => setError(''), 3000)
    }
  }

  if (loading) {
    return <div className="loading">Cargando panel...</div>
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>👥 Panel de Gestión de Usuarios</h1>
        <button className="btn-logout" onClick={onLogout}>
          Cerrar Sesión
        </button>
      </div>

      <div className="users-section">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="users-header">
          <h2>Usuarios Registrados</h2>
          <button className="btn-add" onClick={handleAddUser}>
            ➕ Agregar Usuario
          </button>
        </div>

        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Fecha de Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn-small btn-edit"
                    onClick={() => handleEditUser(user)}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    className="btn-small btn-delete"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
            No hay usuarios registrados
          </p>
        )}
      </div>

      {showModal && (
        <UserModal
          user={editingUser}
          onSave={handleSaveUser}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function UserModal({ user, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const dataToSend = { ...formData }
    if (user && !dataToSend.password) {
      delete dataToSend.password
    }
    onSave(dataToSend)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{user ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña {user && '(dejar en blanco para no cambiar)'}</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit">
              {user ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App
