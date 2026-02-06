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
  const [events, setEvents] = useState([])
  const [openEvents, setOpenEvents] = useState([])
  const [devices, setDevices] = useState([])
  const [booths, setBooths] = useState([])
  const [activeTab, setActiveTab] = useState('users')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deviceForm, setDeviceForm] = useState({
    deviceId: '',
    userId: '',
    eventId: '',
    mode: 'TOPUP',
    boothId: '',
  })
  const [eventName, setEventName] = useState('')

  useEffect(() => {
    fetchUsers()
    fetchEvents()
    fetchOpenEvents()
    fetchDevices()
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

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API_URL}/events`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setEvents(response.data)
    } catch (err) {
      setError('Error al cargar eventos')
    }
  }

  const fetchOpenEvents = async () => {
    try {
      const response = await axios.get(`${API_URL}/events`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'OPEN' },
      })
      setOpenEvents(response.data)
    } catch (err) {
      setError('Error al cargar eventos abiertos')
    }
  }

  const fetchDevices = async () => {
    try {
      const response = await axios.get(`${API_URL}/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDevices(response.data)
    } catch (err) {
      setError('Error al cargar dispositivos')
    }
  }

  const fetchBooths = async (eventId) => {
    if (!eventId) {
      setBooths([])
      return
    }
    try {
      const response = await axios.get(`${API_URL}/events/${eventId}/booths`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setBooths(response.data)
    } catch (err) {
      setError('Error al cargar booths')
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

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await axios.post(
        `${API_URL}/events`,
        { name: eventName },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setEventName('')
      setSuccess('Evento creado correctamente')
      setTimeout(() => setSuccess(''), 3000)
      fetchEvents()
      fetchOpenEvents()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear evento')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleAuthorizeDevice = async (e) => {
    e.preventDefault()
    setError('')
    if (deviceForm.mode === 'CHARGE' && !deviceForm.boothId) {
      setError('Selecciona un booth para modo CHARGE')
      return
    }
    try {
      await axios.post(
        `${API_URL}/devices/authorize`,
        {
          deviceId: deviceForm.deviceId.trim(),
          userId: deviceForm.userId,
          eventId: deviceForm.eventId,
          mode: deviceForm.mode,
          boothId: deviceForm.mode === 'CHARGE' ? deviceForm.boothId : undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess('Dispositivo autorizado correctamente')
      setTimeout(() => setSuccess(''), 3000)
      setDeviceForm({ deviceId: '', userId: '', eventId: '', mode: 'TOPUP', boothId: '' })
      setBooths([])
      fetchDevices()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al autorizar dispositivo')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleRevokeDevice = async (deviceId) => {
    if (!confirm('¿Revocar este dispositivo?')) return
    try {
      await axios.post(
        `${API_URL}/devices/revoke`,
        { deviceId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess('Dispositivo revocado')
      setTimeout(() => setSuccess(''), 3000)
      fetchDevices()
    } catch (err) {
      setError('Error al revocar dispositivo')
      setTimeout(() => setError(''), 3000)
    }
  }

  if (loading) {
    return <div className="loading">Cargando panel...</div>
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>🛠️ Panel de Administración</h1>
          <p className="subtitle">Usuarios, eventos y dispositivos autorizados</p>
        </div>
        <button className="btn-logout" onClick={onLogout}>
          Cerrar Sesión
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Usuarios
        </button>
        <button
          className={`tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          🎟️ Eventos
        </button>
        <button
          className={`tab ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          📱 Dispositivos
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {activeTab === 'users' && (
        <div className="users-section">
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
      )}

      {activeTab === 'events' && (
        <div className="users-section">
          <div className="users-header">
            <h2>Eventos</h2>
          </div>

          <form className="device-form" onSubmit={handleCreateEvent}>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre del evento</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Evento Primavera"
                  required
                />
              </div>
            </div>
            <button className="btn-add" type="submit">
              ➕ Crear Evento
            </button>
          </form>

          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.id}</td>
                  <td>{event.name}</td>
                  <td>{event.status}</td>
                  <td>{new Date(event.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="users-section">
          <div className="users-header">
            <h2>Dispositivos Autorizados</h2>
          </div>

          <form className="device-form" onSubmit={handleAuthorizeDevice}>
            <div className="form-row">
              <div className="form-group">
                <label>Device ID</label>
                <input
                  type="text"
                  value={deviceForm.deviceId}
                  onChange={(e) => setDeviceForm({ ...deviceForm, deviceId: e.target.value })}
                  placeholder="UUID del dispositivo"
                  required
                />
              </div>
              <div className="form-group">
                <label>Usuario</label>
                <select
                  value={deviceForm.userId}
                  onChange={(e) => setDeviceForm({ ...deviceForm, userId: e.target.value })}
                  required
                >
                  <option value="">Selecciona usuario</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Evento (OPEN)</label>
                <select
                  value={deviceForm.eventId}
                  onChange={(e) => {
                    const eventId = e.target.value
                    setDeviceForm({ ...deviceForm, eventId, boothId: '' })
                    fetchBooths(eventId)
                  }}
                  required
                >
                  <option value="">Selecciona evento</option>
                  {openEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Modo</label>
                <select
                  value={deviceForm.mode}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, mode: e.target.value, boothId: '' })
                  }
                >
                  <option value="TOPUP">TOPUP</option>
                  <option value="CHARGE">CHARGE</option>
                </select>
              </div>
            </div>

            {deviceForm.mode === 'CHARGE' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Booth</label>
                  <select
                    value={deviceForm.boothId}
                    onChange={(e) => setDeviceForm({ ...deviceForm, boothId: e.target.value })}
                    required={deviceForm.mode === 'CHARGE'}
                  >
                    <option value="">Selecciona booth</option>
                    {booths.map((booth) => (
                      <option key={booth.id} value={booth.id}>
                        {booth.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button className="btn-add" type="submit">
              ✅ Autorizar dispositivo
            </button>
          </form>

          <table className="users-table">
            <thead>
              <tr>
                <th>Device ID</th>
                <th>Usuario</th>
                <th>Evento</th>
                <th>Modo</th>
                <th>Booth</th>
                <th>Estado</th>
                <th>Última actividad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.deviceId}>
                  <td>{device.deviceId}</td>
                  <td>{device.user?.name || '-'}</td>
                  <td>
                    {device.event?.name || '-'} ({device.event?.status || '-'})
                  </td>
                  <td>{device.mode}</td>
                  <td>{device.booth?.name || '-'}</td>
                  <td>{device.status}</td>
                  <td>{device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : '-'}</td>
                  <td>
                    <button
                      className="btn-small btn-delete"
                      onClick={() => handleRevokeDevice(device.deviceId)}
                    >
                      🚫 Revocar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
