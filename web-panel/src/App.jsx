import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:3000'
const currencyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const showMoneyDebug = import.meta.env.DEV

const formatCents = (cents) => {
  if (cents == null || Number.isNaN(cents)) return '-'
  return currencyFormatter.format(cents / 100)
}

const formatCentsInput = (cents) => {
  if (cents == null || Number.isNaN(cents)) return ''
  const units = Math.trunc(cents / 100)
  const remainder = Math.abs(cents % 100)
  return `${units}.${remainder.toString().padStart(2, '0')}`
}

const parsePriceInputToCents = (value) => {
  if (!value) return null
  const normalized = value.trim().replace(/[^0-9.,]/g, '')
  if (!normalized) return null
  const [wholePart, fractionPart = ''] = normalized.replace(',', '.').split('.')
  const units = wholePart ? Number.parseInt(wholePart, 10) : 0
  const cents = Number.parseInt((fractionPart + '00').slice(0, 2), 10)
  if (Number.isNaN(units) || Number.isNaN(cents)) return null
  return units * 100 + cents
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
  const [deviceBooths, setDeviceBooths] = useState([])
  const [boothsByEvent, setBoothsByEvent] = useState([])
  const [productsByEvent, setProductsByEvent] = useState([])
  const [boothEdits, setBoothEdits] = useState({})
  const [productEdits, setProductEdits] = useState({})
  const [boothProducts, setBoothProducts] = useState([])
  const [assignmentBooths, setAssignmentBooths] = useState([])
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
  const [boothForm, setBoothForm] = useState({ eventId: '', name: '' })
  const [productForm, setProductForm] = useState({
    eventId: '',
    name: '',
    priceCents: '',
    status: 'ACTIVE',
  })
  const [selectedBoothEventId, setSelectedBoothEventId] = useState('')
  const [selectedProductEventId, setSelectedProductEventId] = useState('')
  const [assignmentEventId, setAssignmentEventId] = useState('')
  const [assignmentBoothId, setAssignmentBoothId] = useState('')

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

  const fetchDeviceBooths = async (eventId) => {
    if (!eventId) {
      setDeviceBooths([])
      return
    }
    try {
      const response = await axios.get(`${API_URL}/booths`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { eventId },
      })
      setDeviceBooths(response.data)
    } catch (err) {
      setError('Error al cargar booths')
    }
  }

  const fetchBoothsByEvent = async (eventId) => {
    if (!eventId) {
      setBoothsByEvent([])
      setBoothEdits({})
      return
    }
    try {
      const response = await axios.get(`${API_URL}/booths`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { eventId },
      })
      setBoothsByEvent(response.data)
      const edits = response.data.reduce((acc, booth) => {
        acc[booth.id] = { name: booth.name, status: booth.status }
        return acc
      }, {})
      setBoothEdits(edits)
    } catch (err) {
      setError('Error al cargar booths')
    }
  }

  const fetchProductsByEvent = async (eventId) => {
    if (!eventId) {
      setProductsByEvent([])
      setProductEdits({})
      return
    }
    try {
      const response = await axios.get(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { eventId },
      })
      setProductsByEvent(response.data)
      const edits = response.data.reduce((acc, product) => {
        acc[product.id] = {
          name: product.name,
          priceCents: formatCentsInput(product.priceCents),
          status: product.status,
        }
        return acc
      }, {})
      setProductEdits(edits)
    } catch (err) {
      setError('Error al cargar productos')
    }
  }

  const fetchAssignmentBooths = async (eventId) => {
    if (!eventId) {
      setAssignmentBooths([])
      setBoothProducts([])
      setAssignmentBoothId('')
      return
    }
    try {
      const response = await axios.get(`${API_URL}/booths`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { eventId },
      })
      setAssignmentBooths(response.data)
    } catch (err) {
      setError('Error al cargar booths')
    }
  }

  const fetchBoothProducts = async (boothId) => {
    if (!boothId) {
      setBoothProducts([])
      return
    }
    try {
      const response = await axios.get(`${API_URL}/booths/${boothId}/products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setBoothProducts(response.data)
    } catch (err) {
      setError('Error al cargar productos del booth')
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
      setDeviceBooths([])
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

  const handleReauthorizeDevice = (device) => {
    const eventId = device.eventId || device.event?.id || ''
    const boothId = device.boothId || device.booth?.id || ''
    setDeviceForm({
      deviceId: device.deviceId,
      userId: device.userId || device.user?.id || '',
      eventId,
      mode: device.mode || 'TOPUP',
      boothId,
    })
    fetchDeviceBooths(eventId)
  }

  const handleDeleteDevice = async (deviceId) => {
    if (
      !confirm(
        '¿Eliminar autorización de este dispositivo?\nEsto elimina la autorización del dispositivo y lo deja como no autorizado.'
      )
    )
      return
    try {
      await axios.delete(`${API_URL}/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSuccess('Autorización eliminada')
      setTimeout(() => setSuccess(''), 3000)
      fetchDevices()
    } catch (err) {
      setError('Error al eliminar autorización')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleCreateBooth = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await axios.post(
        `${API_URL}/booths`,
        { eventId: boothForm.eventId, name: boothForm.name.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setBoothForm({ eventId: boothForm.eventId, name: '' })
      setSuccess('Booth creado correctamente')
      setTimeout(() => setSuccess(''), 3000)
      if (selectedBoothEventId === boothForm.eventId) {
        fetchBoothsByEvent(boothForm.eventId)
      }
      if (assignmentEventId === boothForm.eventId) {
        fetchAssignmentBooths(boothForm.eventId)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear booth')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleBoothEditChange = (boothId, field, value) => {
    setBoothEdits((prev) => ({
      ...prev,
      [boothId]: { ...prev[boothId], [field]: value },
    }))
  }

  const handleSaveBooth = async (boothId) => {
    const data = boothEdits[boothId]
    if (!data) return
    try {
      await axios.patch(
        `${API_URL}/booths/${boothId}`,
        { name: data.name.trim(), status: data.status },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess('Booth actualizado correctamente')
      setTimeout(() => setSuccess(''), 3000)
      fetchBoothsByEvent(selectedBoothEventId)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar booth')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleCreateProduct = async (e) => {
    e.preventDefault()
    setError('')
    const priceCents = parsePriceInputToCents(productForm.priceCents)
    if (priceCents == null) {
      setError('Precio inválido. Usa formato 25.00')
      setTimeout(() => setError(''), 3000)
      return
    }
    if (showMoneyDebug) {
      console.info('MONEY_TRACE create_product', { input: productForm.priceCents, priceCents })
    }
    try {
      await axios.post(
        `${API_URL}/products`,
        {
          eventId: productForm.eventId,
          name: productForm.name.trim(),
          priceCents,
          status: productForm.status,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setProductForm({ eventId: productForm.eventId, name: '', priceCents: '', status: 'ACTIVE' })
      setSuccess('Producto creado correctamente')
      setTimeout(() => setSuccess(''), 3000)
      if (selectedProductEventId === productForm.eventId) {
        fetchProductsByEvent(productForm.eventId)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear producto')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleProductEditChange = (productId, field, value) => {
    setProductEdits((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }))
  }

  const handleSaveProduct = async (productId) => {
    const data = productEdits[productId]
    if (!data) return
    const priceCents = parsePriceInputToCents(data.priceCents)
    if (priceCents == null) {
      setError('Precio inválido. Usa formato 25.00')
      setTimeout(() => setError(''), 3000)
      return
    }
    if (showMoneyDebug) {
      console.info('MONEY_TRACE save_product', { input: data.priceCents, priceCents })
    }
    try {
      await axios.patch(
        `${API_URL}/products/${productId}`,
        {
          name: data.name.trim(),
          priceCents,
          status: data.status,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess('Producto actualizado correctamente')
      setTimeout(() => setSuccess(''), 3000)
      fetchProductsByEvent(selectedProductEventId)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar producto')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleAssignmentEventChange = (eventId) => {
    setAssignmentEventId(eventId)
    setAssignmentBoothId('')
    setBoothProducts([])
    fetchAssignmentBooths(eventId)
  }

  const handleAssignmentBoothChange = (boothId) => {
    setAssignmentBoothId(boothId)
    fetchBoothProducts(boothId)
  }

  const handleToggleBoothProduct = (productId) => {
    setBoothProducts((prev) =>
      prev.map((product) =>
        product.id === productId ? { ...product, enabled: !product.enabled } : product
      )
    )
  }

  const handleSaveBoothProducts = async (e) => {
    e.preventDefault()
    if (!assignmentBoothId) {
      setError('Selecciona un booth')
      return
    }
    try {
      await axios.put(
        `${API_URL}/booths/${assignmentBoothId}/products`,
        boothProducts.map((product) => ({
          productId: product.id,
          enabled: product.enabled,
        })),
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess('Productos del booth actualizados')
      setTimeout(() => setSuccess(''), 3000)
      fetchBoothProducts(assignmentBoothId)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar productos del booth')
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
        <button
          className={`tab ${activeTab === 'booths' ? 'active' : ''}`}
          onClick={() => setActiveTab('booths')}
        >
          🧾 Booths
        </button>
        <button
          className={`tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🛒 Productos
        </button>
        <button
          className={`tab ${activeTab === 'booth-products' ? 'active' : ''}`}
          onClick={() => setActiveTab('booth-products')}
        >
          🔗 Booth → Productos
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
                    fetchDeviceBooths(eventId)
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
                    {deviceBooths.map((booth) => (
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
                    {device.status === 'AUTHORIZED' && (
                      <button
                        className="btn-small btn-delete"
                        onClick={() => handleRevokeDevice(device.deviceId)}
                      >
                        🚫 Revocar
                      </button>
                    )}
                    {device.status === 'REVOKED' && (
                      <button
                        className="btn-small btn-edit"
                        onClick={() => handleReauthorizeDevice(device)}
                      >
                        ♻️ Reautorizar
                      </button>
                    )}
                    <button
                      className="btn-small btn-delete"
                      onClick={() => handleDeleteDevice(device.deviceId)}
                    >
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'booths' && (
        <div className="users-section">
          <div className="users-header">
            <h2>Booths</h2>
          </div>

          <form className="device-form" onSubmit={handleCreateBooth}>
            <div className="form-row">
              <div className="form-group">
                <label>Evento</label>
                <select
                  value={boothForm.eventId}
                  onChange={(e) => setBoothForm({ ...boothForm, eventId: e.target.value })}
                  required
                >
                  <option value="">Selecciona evento</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nombre del booth</label>
                <input
                  type="text"
                  value={boothForm.name}
                  onChange={(e) => setBoothForm({ ...boothForm, name: e.target.value })}
                  placeholder="Barra principal"
                  required
                />
              </div>
            </div>
            <button className="btn-add" type="submit">
              ➕ Crear Booth
            </button>
          </form>

          <form className="device-form">
            <div className="form-row">
              <div className="form-group">
                <label>Evento para listar booths</label>
                <select
                  value={selectedBoothEventId}
                  onChange={(e) => {
                    const eventId = e.target.value
                    setSelectedBoothEventId(eventId)
                    fetchBoothsByEvent(eventId)
                  }}
                >
                  <option value="">Selecciona evento</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>

          <table className="users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {boothsByEvent.map((booth) => (
                <tr key={booth.id}>
                  <td>
                    <input
                      type="text"
                      value={boothEdits[booth.id]?.name || ''}
                      onChange={(e) => handleBoothEditChange(booth.id, 'name', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={boothEdits[booth.id]?.status || 'ACTIVE'}
                      onChange={(e) => handleBoothEditChange(booth.id, 'status', e.target.value)}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </td>
                  <td>{new Date(booth.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-small btn-edit" onClick={() => handleSaveBooth(booth.id)}>
                      💾 Guardar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {boothsByEvent.length === 0 && (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              Selecciona un evento para ver sus booths
            </p>
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div className="users-section">
          <div className="users-header">
            <h2>Productos</h2>
          </div>

          <form className="device-form" onSubmit={handleCreateProduct}>
            <div className="form-row">
              <div className="form-group">
                <label>Evento</label>
                <select
                  value={productForm.eventId}
                  onChange={(e) => setProductForm({ ...productForm, eventId: e.target.value })}
                  required
                >
                  <option value="">Selecciona evento</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Agua 500ml"
                  required
                />
              </div>
              <div className="form-group">
                <label>Precio</label>
                <input
                  type="text"
                  value={productForm.priceCents}
                  onChange={(e) => setProductForm({ ...productForm, priceCents: e.target.value })}
                  placeholder="25.00"
                  required
                />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select
                  value={productForm.status}
                  onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
            <button className="btn-add" type="submit">
              ➕ Crear Producto
            </button>
          </form>

          <form className="device-form">
            <div className="form-row">
              <div className="form-group">
                <label>Evento para listar productos</label>
                <select
                  value={selectedProductEventId}
                  onChange={(e) => {
                    const eventId = e.target.value
                    setSelectedProductEventId(eventId)
                    fetchProductsByEvent(eventId)
                  }}
                >
                  <option value="">Selecciona evento</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>

          <table className="users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productsByEvent.map((product) => (
                <tr key={product.id}>
                  <td>
                    <input
                      type="text"
                      value={productEdits[product.id]?.name || ''}
                      onChange={(e) => handleProductEditChange(product.id, 'name', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={productEdits[product.id]?.priceCents ?? ''}
                      onChange={(e) =>
                        handleProductEditChange(product.id, 'priceCents', e.target.value)
                      }
                    />
                    {showMoneyDebug && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        {formatCents(parsePriceInputToCents(productEdits[product.id]?.priceCents))}{' '}
                        (raw: {product.priceCents})
                      </div>
                    )}
                  </td>
                  <td>
                    <select
                      value={productEdits[product.id]?.status || 'ACTIVE'}
                      onChange={(e) => handleProductEditChange(product.id, 'status', e.target.value)}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </td>
                  <td>{new Date(product.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn-small btn-edit"
                      onClick={() => handleSaveProduct(product.id)}
                    >
                      💾 Guardar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {productsByEvent.length === 0 && (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              Selecciona un evento para ver sus productos
            </p>
          )}
        </div>
      )}

      {activeTab === 'booth-products' && (
        <div className="users-section">
          <div className="users-header">
            <h2>Booth → Productos</h2>
          </div>

          <form className="device-form" onSubmit={handleSaveBoothProducts}>
            <div className="form-row">
              <div className="form-group">
                <label>Evento</label>
                <select
                  value={assignmentEventId}
                  onChange={(e) => handleAssignmentEventChange(e.target.value)}
                  required
                >
                  <option value="">Selecciona evento</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Booth</label>
                <select
                  value={assignmentBoothId}
                  onChange={(e) => handleAssignmentBoothChange(e.target.value)}
                  required
                >
                  <option value="">Selecciona booth</option>
                  {assignmentBooths.map((booth) => (
                    <option key={booth.id} value={booth.id}>
                      {booth.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="checklist">
              {boothProducts.map((product) => (
                <label className="checklist-item" key={product.id}>
                  <input
                    type="checkbox"
                    checked={product.enabled}
                    onChange={() => handleToggleBoothProduct(product.id)}
                  />
                  <span>
                    {product.name} — {formatCents(product.priceCents)}
                    {showMoneyDebug ? ` (raw: ${product.priceCents})` : ''} ({product.status})
                  </span>
                </label>
              ))}
            </div>

            {boothProducts.length === 0 && (
              <p style={{ textAlign: 'center', color: '#999', padding: '10px' }}>
                Selecciona un booth para ver sus productos
              </p>
            )}

            <button className="btn-add" type="submit">
              💾 Guardar configuración
            </button>
          </form>
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
