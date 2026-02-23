import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:3000'
const REPORTS_DEFAULT_LIMIT = 20

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
  const [eventStatusLoading, setEventStatusLoading] = useState({})
  const [eventStatusModal, setEventStatusModal] = useState(null)
  const [reportsEventId, setReportsEventId] = useState('')
  const [reportsSummary, setReportsSummary] = useState(null)
  const [reportsByBooth, setReportsByBooth] = useState([])
  const [reportsByProduct, setReportsByProduct] = useState([])
  const [reportTransactions, setReportTransactions] = useState([])
  const [reportPagination, setReportPagination] = useState({ page: 1, limit: REPORTS_DEFAULT_LIMIT, total: 0 })
  const [reportFilters, setReportFilters] = useState({ boothId: '', from: '', to: '' })
  const [appliedReportFilters, setAppliedReportFilters] = useState({ boothId: '', from: '', to: '' })
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsView, setReportsView] = useState('summary')
  const [incidentFilters, setIncidentFilters] = useState({ wristbandId: '', code: '', from: '', to: '' })
  const [appliedIncidentFilters, setAppliedIncidentFilters] = useState({ wristbandId: '', code: '', from: '', to: '' })
  const [incidents, setIncidents] = useState([])
  const [incidentPagination, setIncidentPagination] = useState({ page: 1, limit: REPORTS_DEFAULT_LIMIT, total: 0 })
  const [incidentsLoading, setIncidentsLoading] = useState(false)
  const [replaceModal, setReplaceModal] = useState(null)
  const [replaceInput, setReplaceInput] = useState('')

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
          priceCents: product.priceCents,
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

  const openEventStatusModal = (event) => {
    const nextStatus = event.status === 'OPEN' ? 'CLOSED' : 'OPEN'
    setEventStatusModal({ event, nextStatus })
  }

  const closeEventStatusModal = () => {
    setEventStatusModal(null)
  }

  const handleToggleEventStatus = async () => {
    if (!eventStatusModal?.event) return

    const { event, nextStatus } = eventStatusModal
    setError('')
    setEventStatusLoading((prev) => ({ ...prev, [event.id]: true }))

    try {
      const response = await axios.patch(
        `${API_URL}/events/${event.id}/status`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const updatedEvent = response.data
      setEvents((prev) => prev.map((item) => (item.id === updatedEvent.id ? updatedEvent : item)))
      setOpenEvents((prev) => {
        if (updatedEvent.status === 'OPEN') {
          const exists = prev.some((item) => item.id === updatedEvent.id)
          if (exists) {
            return prev.map((item) => (item.id === updatedEvent.id ? updatedEvent : item))
          }
          return [...prev, updatedEvent]
        }
        return prev.filter((item) => item.id !== updatedEvent.id)
      })
      setSuccess(
        updatedEvent.status === 'OPEN'
          ? 'Evento abierto correctamente'
          : 'Evento cerrado correctamente'
      )
      setTimeout(() => setSuccess(''), 3000)
      closeEventStatusModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar estado del evento')
      setTimeout(() => setError(''), 3000)
    } finally {
      setEventStatusLoading((prev) => ({ ...prev, [event.id]: false }))
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
    try {
      await axios.post(
        `${API_URL}/products`,
        {
          eventId: productForm.eventId,
          name: productForm.name.trim(),
          priceCents: Number(productForm.priceCents),
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
    try {
      await axios.patch(
        `${API_URL}/products/${productId}`,
        {
          name: data.name.trim(),
          priceCents: Number(data.priceCents),
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


  const localDateTimeToUtcIso = (value, boundary = 'start') => {
    if (!value) return undefined

    const source = value.length === 10
      ? `${value}T${boundary === 'end' ? '23:59:59.999' : '00:00:00.000'}`
      : value

    const match = source.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/)
    if (!match) return undefined

    const [, y, m, d, hh, mm, ss = '0', ms = '0'] = match
    const msPadded = ms.padEnd(3, '0')
    const localDate = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss),
      Number(msPadded),
    )

    return localDate.toISOString()
  }

  const toReportApiDate = (value, boundary = 'start') => {
    if (!value) return undefined

    const normalized = value.length === 10
      ? `${value}T${boundary === 'end' ? '23:59:59.999' : '00:00:00.000'}`
      : value

    return localDateTimeToUtcIso(normalized)
  }

  const getReportQueryParams = (page = 1, filters = appliedReportFilters, limit = reportPagination.limit) => {
    const params = {
      boothId: filters.boothId || undefined,
      from: toReportApiDate(filters.from, 'start'),
      to: toReportApiDate(filters.to, 'end'),
      page,
      limit,
    }

    return params
  }

  const loadReports = async (
    eventId,
    page = 1,
    filters = appliedReportFilters,
    limit = reportPagination.limit,
  ) => {
    if (!eventId) {
      setReportsSummary(null)
      setReportsByBooth([])
      setReportsByProduct([])
      setReportTransactions([])
      setReportPagination({ page: 1, limit: REPORTS_DEFAULT_LIMIT, total: 0 })
      return
    }

    const queryParams = getReportQueryParams(page, filters, limit)

    setReportsLoading(true)
    try {
      const [summaryRes, byBoothRes, byProductRes, txRes] = await Promise.all([
        axios.get(`${API_URL}/reports/events/${eventId}/summary`, {
          headers: { Authorization: `Bearer ${token}` },
          params: queryParams,
        }),
        axios.get(`${API_URL}/reports/events/${eventId}/by-booth`, {
          headers: { Authorization: `Bearer ${token}` },
          params: queryParams,
        }),
        axios.get(`${API_URL}/reports/events/${eventId}/by-product`, {
          headers: { Authorization: `Bearer ${token}` },
          params: queryParams,
        }),
        axios.get(`${API_URL}/reports/events/${eventId}/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
          params: queryParams,
        }),
      ])

      setReportsSummary(summaryRes.data)
      setReportsByBooth(byBoothRes.data)
      setReportsByProduct(byProductRes.data)
      setReportTransactions(txRes.data.items || [])
      setReportPagination({
        page: Number(txRes.data.page) || 1,
        limit: Number(txRes.data.limit) || REPORTS_DEFAULT_LIMIT,
        total: Number(txRes.data.total) || 0,
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar reportes')
      setTimeout(() => setError(''), 3000)
    } finally {
      setReportsLoading(false)
    }
  }

  const loadReportTransactionsPage = async (
    eventId,
    page,
    filters = appliedReportFilters,
    limit = reportPagination.limit,
  ) => {
    if (!eventId) return

    const queryParams = getReportQueryParams(page, filters, limit)

    setReportsLoading(true)
    try {
      const txRes = await axios.get(`${API_URL}/reports/events/${eventId}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: queryParams,
      })

      setReportTransactions(txRes.data.items || [])
      setReportPagination({
        page: Number(txRes.data.page) || 1,
        limit: Number(txRes.data.limit) || REPORTS_DEFAULT_LIMIT,
        total: Number(txRes.data.total) || 0,
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar transacciones')
      setTimeout(() => setError(''), 3000)
    } finally {
      setReportsLoading(false)
    }
  }

  const handleReportsEventChange = async (eventId) => {
    setReportsEventId(eventId)
    setIncidentPagination({ page: 1, limit: REPORTS_DEFAULT_LIMIT, total: 0 })
    await loadReports(eventId, 1)
    await loadIncidents(eventId, 1)
  }

  const handleApplyReportFilters = async (e) => {
    e.preventDefault()
    const nextFilters = { ...reportFilters }
    setAppliedReportFilters(nextFilters)
    await loadReports(reportsEventId, 1, nextFilters)
  }


  const hasActiveReportFilters = useMemo(
    () =>
      Boolean(appliedReportFilters.boothId || appliedReportFilters.from || appliedReportFilters.to) ||
      Number(reportPagination.page) !== 1 ||
      Number(reportPagination.limit) !== REPORTS_DEFAULT_LIMIT,
    [appliedReportFilters, reportPagination.limit, reportPagination.page],
  )

  const handleClearReportFilters = async () => {
    if (!reportsEventId || reportsLoading || !hasActiveReportFilters) return

    const clearedFilters = { boothId: '', from: '', to: '' }
    setReportFilters(clearedFilters)
    setAppliedReportFilters(clearedFilters)
    await loadReports(reportsEventId, 1, clearedFilters, REPORTS_DEFAULT_LIMIT)
  }

  const handleReportPageChange = async (nextPage) => {
    if (!reportsEventId) return
    await loadReportTransactionsPage(reportsEventId, Number(nextPage), appliedReportFilters)
  }

  const handleReportPrevPage = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (reportsLoading) return

    const nextPage = Math.max(1, Number(reportPagination.page) - 1)

    await handleReportPageChange(nextPage)
  }

  const handleReportNextPage = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (reportsLoading) return

    const nextPage = Number(reportPagination.page) + 1

    await handleReportPageChange(nextPage)
  }

  const handleIncidentPageChange = async (nextPage) => {
    if (!reportsEventId) return
    await loadIncidents(reportsEventId, Number(nextPage), appliedIncidentFilters)
  }

  const handleExportCsv = async () => {
    if (!reportsEventId || !reportsSummary || reportsSummary.totalCents <= 0) {
      return
    }

    try {
      const queryParams = getReportQueryParams(1, appliedReportFilters)
      const response = await axios.get(`${API_URL}/reports/events/${reportsEventId}/export.csv`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        params: queryParams,
      })

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `cierre-evento-${reportsEventId}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al exportar CSV')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleExportProductsCsv = async () => {
    if (!reportsEventId) {
      return
    }

    try {
      const queryParams = getReportQueryParams(1, appliedReportFilters)
      const response = await axios.get(`${API_URL}/reports/events/${reportsEventId}/export-products.csv`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        params: queryParams,
      })

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `ventas-productos-evento-${reportsEventId}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al exportar CSV de productos')
      setTimeout(() => setError(''), 3000)
    }
  }

  const getIncidentQueryParams = (page = 1, filters = appliedIncidentFilters) => {
    const params = { page, limit: incidentPagination.limit || REPORTS_DEFAULT_LIMIT }
    if (filters.wristbandId) params.wristbandId = filters.wristbandId.trim()
    if (filters.code) params.code = filters.code
    if (filters.from) params.from = localDateTimeToUtcIso(filters.from, 'start')
    if (filters.to) params.to = localDateTimeToUtcIso(filters.to, 'end')
    return params
  }

  const loadIncidents = async (eventId, page = 1, filters = appliedIncidentFilters) => {
    if (!eventId) {
      setIncidents([])
      setIncidentPagination({ page: 1, limit: REPORTS_DEFAULT_LIMIT, total: 0 })
      return
    }

    setIncidentsLoading(true)
    try {
      const response = await axios.get(`${API_URL}/admin/events/${eventId}/incidents`, {
        headers: { Authorization: `Bearer ${token}` },
        params: getIncidentQueryParams(page, filters),
      })
      setIncidents(response.data.items || [])
      setIncidentPagination({
        page: Number(response.data.page) || 1,
        limit: Number(response.data.limit) || REPORTS_DEFAULT_LIMIT,
        total: Number(response.data.total) || 0,
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar incidentes')
      setTimeout(() => setError(''), 3000)
    } finally {
      setIncidentsLoading(false)
    }
  }

  const handleApplyIncidentFilters = async (e) => {
    e.preventDefault()
    const nextFilters = { ...incidentFilters }
    setAppliedIncidentFilters(nextFilters)
    await loadIncidents(reportsEventId, 1, nextFilters)
  }

  const handleIncidentResync = async (incident) => {
    const defaultCtr = incident?.resultJson?.tagCtr ?? incident?.payloadJson?.gotCtr ?? ''
    const targetCtrInput = prompt('CTR objetivo para resync', `${defaultCtr}`)
    if (targetCtrInput === null) return
    const targetCtr = Number(targetCtrInput)
    if (!Number.isInteger(targetCtr) || targetCtr < 0) {
      setError('CTR inválido')
      setTimeout(() => setError(''), 3000)
      return
    }
    if (!confirm(`¿Confirmar RESYNC manual de la pulsera ${incident.wristbandId} a CTR=${targetCtr}?`)) return

    try {
      await axios.post(
        `${API_URL}/admin/wristbands/${incident.wristbandId}/resync`,
        { eventId: reportsEventId, targetCtr },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setSuccess('Resync aplicado correctamente')
      setTimeout(() => setSuccess(''), 3000)
      await loadIncidents(reportsEventId, incidentPagination.page, appliedIncidentFilters)
    } catch (err) {
      const code = err.response?.data?.code
      if (code === 'WRISTBAND_REPLACE_REQUIRED') {
        const balanceCents = err.response?.data?.balanceCents ?? 0
        setError(`Pulsera atrasada (tagCtr < serverCtr). Reemplazo requerido. Saldo: $${(balanceCents / 100).toFixed(2)}`)
      } else {
        setError(err.response?.data?.message || 'Error al ejecutar resync')
      }
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleIncidentInvalidate = async (incident) => {
    if (!confirm(`¿Invalidar la pulsera ${incident.wristbandId}?`)) return
    const reason = prompt('Motivo de invalidación', 'Operación administrativa')
    if (reason === null) return

    try {
      await axios.post(
        `${API_URL}/admin/wristbands/${incident.wristbandId}/invalidate`,
        { eventId: reportsEventId, reason },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setSuccess('Pulsera invalidada correctamente')
      setTimeout(() => setSuccess(''), 3000)
      await loadIncidents(reportsEventId, incidentPagination.page, appliedIncidentFilters)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al invalidar pulsera')
      setTimeout(() => setError(''), 3000)
    }
  }


  const incidentNeedsReplace = (incident) => {
    const code = incident?.resultJson?.code
    const serverCtr = Number(incident?.resultJson?.serverCtr)
    const tagCtrRaw = incident?.resultJson?.tagCtr ?? incident?.payloadJson?.gotCtr
    const tagCtr = Number(tagCtrRaw)
    if (code === 'WRISTBAND_REPLACE_REQUIRED') return true
    if (code !== 'CTR_REPLAY') return false
    return Number.isFinite(serverCtr) && Number.isFinite(tagCtr) && tagCtr < serverCtr
  }

  const openReplaceModal = async (incident) => {
    try {
      const response = await axios.get(`${API_URL}/admin/wristbands/${incident.wristbandId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setReplaceModal({ incident, wristband: response.data })
      setReplaceInput('')
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar saldo de la pulsera')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleConfirmReplace = async () => {
    if (!replaceModal) return
    if (!replaceInput.trim()) {
      setError('Debes ingresar UID de la nueva pulsera')
      setTimeout(() => setError(''), 3000)
      return
    }

    try {
      const response = await axios.post(
        `${API_URL}/admin/wristbands/${replaceModal.incident.wristbandId}/replace`,
        {
          eventId: reportsEventId,
          newTagUid: replaceInput.trim(),
          reason: 'REPLACE_REQUIRED_TAG_BEHIND',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setSuccess(`Pulsera reemplazada. Nueva: ${response.data.newWristbandId}`)
      setTimeout(() => setSuccess(''), 4000)
      setReplaceModal(null)
      setReplaceInput('')
      await loadIncidents(reportsEventId, incidentPagination.page, appliedIncidentFilters)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al reemplazar pulsera')
      setTimeout(() => setError(''), 3000)
    }
  }

  const renderRawCents = (value) => (value === null || value === undefined ? '—' : `${value}`)

  const truncateText = (value, size = 10) => {
    if (!value) return '—'
    const text = `${value}`
    return text.length > size ? `${text.slice(0, size)}…` : text
  }

  const truncateId = (value, head = 8, tail = 5) => {
    if (!value) return '—'
    const text = `${value}`
    if (text.length <= head + tail + 1) return text
    return `${text.slice(0, head)}…${text.slice(-tail)}`
  }

  const copyToClipboard = async (value, label = 'Valor') => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(`${value}`)
      setSuccess(`${label} copiado`)
      setTimeout(() => setSuccess(''), 1500)
    } catch (err) {
      setError('No se pudo copiar al portapapeles')
      setTimeout(() => setError(''), 2000)
    }
  }

  const renderCopyableId = (value, label) => {
    if (!value) return <span title="Sin dato">—</span>
    const fullValue = `${value}`
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
        <span title={fullValue}>{truncateId(fullValue, 8, 4)}</span>
        <button
          type="button"
          className="btn-small"
          style={{ padding: '2px 8px', lineHeight: 1 }}
          onClick={() => copyToClipboard(fullValue, label)}
          title={`Copiar ${label}`}
        >
          📋
        </button>
      </div>
    )
  }

  const boothNameById = useMemo(() => new Map(reportsByBooth.map((row) => [row.boothId, row.boothName])), [reportsByBooth])

  const totalReportPages = Math.max(1, Math.ceil(reportPagination.total / reportPagination.limit || 1))
  const hasPrevReportPage = reportPagination.page > 1
  const hasNextReportPage = reportPagination.page < totalReportPages
  const totalIncidentPages = Math.max(1, Math.ceil(incidentPagination.total / incidentPagination.limit || 1))

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
        <button
          className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📊 Reportes / Cierre
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.id}</td>
                  <td>{event.name}</td>
                  <td>
                    <span
                      className={`status-badge ${event.status === 'OPEN' ? 'status-open' : 'status-closed'}`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td>{new Date(event.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className={`btn-small ${event.status === 'OPEN' ? 'btn-delete' : 'btn-edit'}`}
                      onClick={() => openEventStatusModal(event)}
                      disabled={!!eventStatusLoading[event.id]}
                    >
                      {eventStatusLoading[event.id]
                        ? 'Actualizando...'
                        : event.status === 'OPEN'
                          ? 'Cerrar evento'
                          : 'Abrir evento'}
                    </button>
                  </td>
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
                <label>Precio (centavos)</label>
                <input
                  type="number"
                  min="0"
                  value={productForm.priceCents}
                  onChange={(e) => setProductForm({ ...productForm, priceCents: e.target.value })}
                  placeholder="1500"
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
                <th>Precio (centavos)</th>
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
                      type="number"
                      min="0"
                      value={productEdits[product.id]?.priceCents ?? ''}
                      onChange={(e) =>
                        handleProductEditChange(product.id, 'priceCents', e.target.value)
                      }
                    />
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
                    {product.name} — {product.priceCents}¢ ({product.status})
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



      {activeTab === 'reports' && (
        <div className="users-section">
          <div className="users-header">
            <h2>Reportes / Cierre</h2>
            <div style={{ display: 'flex', gap: '8px', marginRight: 'auto', marginLeft: '16px' }}>
              <button
                type="button"
                className="btn-small"
                style={{ opacity: reportsView === 'summary' ? 1 : 0.7 }}
                onClick={() => setReportsView('summary')}
              >
                Resumen
              </button>
              <button
                type="button"
                className="btn-small"
                style={{ opacity: reportsView === 'incidents' ? 1 : 0.7 }}
                onClick={() => setReportsView('incidents')}
              >
                Incidentes
              </button>
            </div>
            <button
              className="btn-add"
              onClick={handleExportCsv}
              disabled={!reportsSummary || reportsSummary.totalCents <= 0}
              style={{ opacity: !reportsSummary || reportsSummary.totalCents <= 0 ? 0.6 : 1 }}
            >
              ⬇️ Exportar CSV
            </button>
            <button
              className="btn-add"
              onClick={handleExportProductsCsv}
              disabled={!reportsEventId}
              style={{ opacity: !reportsEventId ? 0.6 : 1 }}
            >
              ⬇️ Export CSV (Productos)
            </button>
          </div>

          {reportsView === 'summary' && (
          <>
          <form className="device-form" onSubmit={handleApplyReportFilters}>
            <div className="form-row">
              <div className="form-group">
                <label>Evento</label>
                <select value={reportsEventId} onChange={(e) => handleReportsEventChange(e.target.value)} required>
                  <option value="">Selecciona evento</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Booth (opcional)</label>
                <select
                  value={reportFilters.boothId}
                  onChange={(e) => setReportFilters((prev) => ({ ...prev, boothId: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {reportsByBooth.map((booth) => (
                    <option key={booth.boothId} value={booth.boothId}>
                      {booth.boothName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Desde (opcional)</label>
                <input
                  type="datetime-local"
                  value={reportFilters.from}
                  onChange={(e) => setReportFilters((prev) => ({ ...prev, from: e.target.value || '' }))}
                />
              </div>
              <div className="form-group">
                <label>Hasta (opcional)</label>
                <input
                  type="datetime-local"
                  value={reportFilters.to}
                  onChange={(e) => setReportFilters((prev) => ({ ...prev, to: e.target.value || '' }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn-add" type="submit" disabled={!reportsEventId || reportsLoading}>
                🔍 Aplicar filtros
              </button>
              <button
                className="btn-add"
                type="button"
                onClick={handleClearReportFilters}
                disabled={!reportsEventId || reportsLoading || !hasActiveReportFilters}
                style={{ opacity: !reportsEventId || reportsLoading || !hasActiveReportFilters ? 0.6 : 1 }}
              >
                🧹 Limpiar filtros
              </button>
            </div>
          </form>

          {reportsLoading && <p style={{ marginBottom: '12px' }}>Cargando reportes...</p>}

          {reportsSummary && (
            <div className="report-cards">
              <div className="report-card">
                <span>Total vendido</span>
                <strong>{renderRawCents(reportsSummary.totalCents)}</strong>
              </div>
              <div className="report-card">
                <span>Cantidad de cobros</span>
                <strong>{reportsSummary.chargesApproved}</strong>
              </div>
              <div className="report-card">
                <span>Rechazos</span>
                <strong>{reportsSummary.chargesDeclined}</strong>
              </div>
            </div>
          )}

          {reportsSummary && reportsSummary.chargesTotal === 0 && (
            <p style={{ textAlign: 'center', color: '#999', padding: '12px 0' }}>Sin ventas</p>
          )}

          <h3 style={{ marginBottom: '10px' }}>Ventas por Booth</h3>
          <table className="users-table">
            <thead>
              <tr>
                <th>Booth</th>
                <th>Cobros aprobados</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {reportsByBooth.map((row) => (
                <tr key={row.boothId}>
                  <td>{row.boothName}</td>
                  <td>{row.chargesCount}</td>
                  <td>{renderRawCents(row.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {reportsByBooth.length === 0 && reportsSummary && (
            <p style={{ textAlign: 'center', color: '#999', padding: '10px' }}>Sin ventas por booth</p>
          )}

          <h3 style={{ margin: '10px 0' }}>Ventas por Producto</h3>
          <table className="users-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Unidades</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {reportsByProduct.map((row) => (
                <tr key={row.productId}>
                  <td>{row.productName}</td>
                  <td>{row.qtySold}</td>
                  <td>{renderRawCents(row.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {reportsByProduct.length === 0 && reportsSummary && (
            <p style={{ textAlign: 'center', color: '#999', padding: '10px' }}>Sin ventas por producto</p>
          )}

          <h3 style={{ margin: '10px 0' }}>Transacciones</h3>
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th style={{ textAlign: 'left' }}>Booth</th>
                <th>Monto (centavos)</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {reportTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td title={tx.id || ''}>{truncateId(tx.id)}</td>
                  <td style={{ textAlign: 'left' }}>
                    {boothNameById.get(tx.boothId) || (
                      <span title={tx.boothId || ''}>{truncateId(tx.boothId)}</span>
                    )}
                  </td>
                  <td>{renderRawCents(tx.amountCents)}</td>
                  <td>{tx.status}</td>
                  <td>{new Date(tx.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {reportTransactions.length === 0 && reportsSummary && (
            <p style={{ textAlign: 'center', color: '#999', padding: '10px' }}>Sin transacciones</p>
          )}

          {reportPagination.total > reportPagination.limit && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-small"
                disabled={!hasPrevReportPage || reportsLoading}
                onClick={handleReportPrevPage}
              >
                ← Anterior
              </button>
              <button
                type="button"
                className="btn-small"
                disabled={!hasNextReportPage || reportsLoading}
                onClick={handleReportNextPage}
              >
                Siguiente →
              </button>
            </div>
          )}
          </>
          )}

          {reportsView === 'incidents' && (
            <>
              <form className="device-form" onSubmit={handleApplyIncidentFilters}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Evento</label>
                    <select value={reportsEventId} onChange={(e) => handleReportsEventChange(e.target.value)} required>
                      <option value="">Selecciona evento</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Wristband ID</label>
                    <input
                      type="text"
                      value={incidentFilters.wristbandId}
                      onChange={(e) => setIncidentFilters((prev) => ({ ...prev, wristbandId: e.target.value }))}
                      placeholder="UUID pulsera"
                    />
                  </div>
                  <div className="form-group">
                    <label>Código CTR</label>
                    <select
                      value={incidentFilters.code}
                      onChange={(e) => setIncidentFilters((prev) => ({ ...prev, code: e.target.value }))}
                    >
                      <option value="">TODOS</option>
                      <option value="CTR_REPLAY">CTR_REPLAY</option>
                      <option value="CTR_FORWARD_JUMP">CTR_FORWARD_JUMP</option>
                      <option value="CTR_RESYNC_DONE_RETRY">CTR_RESYNC_DONE_RETRY</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Desde</label>
                    <input
                      type="datetime-local"
                      value={incidentFilters.from}
                      onChange={(e) => setIncidentFilters((prev) => ({ ...prev, from: e.target.value || '' }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Hasta</label>
                    <input
                      type="datetime-local"
                      value={incidentFilters.to}
                      onChange={(e) => setIncidentFilters((prev) => ({ ...prev, to: e.target.value || '' }))}
                    />
                  </div>
                </div>
                <button className="btn-add" type="submit" disabled={!reportsEventId || incidentsLoading}>
                  🔍 Buscar incidentes
                </button>
              </form>

              {incidentsLoading && <p style={{ marginBottom: '12px' }}>Cargando incidentes...</p>}

              <div className="incidents-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Fecha/hora</th>
                      <th>tagUidHex</th>
                      <th>wristbandId</th>
                      <th>code</th>
                      <th>serverCtr</th>
                      <th>tagCtr</th>
                      <th>deviceId</th>
                      <th>transactionId</th>
                      <th>Resync</th>
                      <th>Invalidar</th>
                      <th>Reemplazar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((incident) => (
                      <tr key={`${incident.eventId}-${incident.id}`}>
                        <td>{new Date(incident.createdAt).toLocaleString()}</td>
                        <td>{renderCopyableId(incident.tagUidHex || incident?.payloadJson?.uidHex, 'tagUidHex')}</td>
                        <td>{renderCopyableId(incident.wristbandId, 'wristbandId')}</td>
                        <td>{incident?.resultJson?.code || '—'}</td>
                        <td>{incident?.resultJson?.serverCtr ?? '—'}</td>
                        <td>{incident?.resultJson?.tagCtr ?? incident?.payloadJson?.gotCtr ?? '—'}</td>
                        <td>{incident.deviceId || incident?.payloadJson?.deviceId || '—'}</td>
                        <td>{renderCopyableId(incident.id, 'transactionId')}</td>
                        <td className="incidents-actions-cell">
                          <button className="btn-small btn-edit" onClick={() => handleIncidentResync(incident)}>
                            Resync
                          </button>
                        </td>
                        <td className="incidents-actions-cell">
                          <button className="btn-small btn-delete" onClick={() => handleIncidentInvalidate(incident)}>
                            Invalidar
                          </button>
                        </td>
                        <td className="incidents-actions-cell">
                          {incidentNeedsReplace(incident) ? (
                            <button className="btn-small btn-add" onClick={() => openReplaceModal(incident)}>
                              Reemplazar
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {incidents.length === 0 && reportsEventId && (
                <p style={{ textAlign: 'center', color: '#999', padding: '10px' }}>Sin incidentes CTR</p>
              )}

              {incidentPagination.total > incidentPagination.limit && (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-small"
                    disabled={incidentPagination.page <= 1 || incidentsLoading}
                    onClick={() => handleIncidentPageChange(incidentPagination.page - 1)}
                  >
                    ← Anterior
                  </button>
                  <span style={{ alignSelf: 'center' }}>{incidentPagination.page} / {totalIncidentPages}</span>
                  <button
                    type="button"
                    className="btn-small"
                    disabled={incidentPagination.page >= totalIncidentPages || incidentsLoading}
                    onClick={() => handleIncidentPageChange(incidentPagination.page + 1)}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}


      {replaceModal && (
        <div className="modal-overlay" onClick={() => setReplaceModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reemplazar pulsera</h2>
            <p><strong>Pulsera actual:</strong> {replaceModal.wristband.wristbandId}</p>
            <p><strong>Saldo a transferir:</strong> ${(replaceModal.wristband.balanceCents / 100).toFixed(2)}</p>
            <div className="form-group">
              <label>UID nueva pulsera</label>
              <input value={replaceInput} onChange={(e) => setReplaceInput(e.target.value)} placeholder="uid hex" />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setReplaceModal(null)}>Cancelar</button>
              <button className="btn-save" onClick={handleConfirmReplace}>Reemplazar pulsera</button>
            </div>
          </div>
        </div>
      )}

      {eventStatusModal && (
        <div className="modal-overlay" onClick={closeEventStatusModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {eventStatusModal.nextStatus === 'CLOSED' ? 'Cerrar evento' : 'Abrir evento'}
            </h2>
            <p>
              {eventStatusModal.nextStatus === 'CLOSED'
                ? '¿Cerrar evento? Esto bloqueará cobros/topups/balance en dispositivos.'
                : '¿Abrir evento? Esto habilitará operaciones en dispositivos.'}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={closeEventStatusModal}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={handleToggleEventStatus}
                disabled={!!eventStatusLoading[eventStatusModal.event.id]}
              >
                {eventStatusLoading[eventStatusModal.event.id]
                  ? 'Actualizando...'
                  : eventStatusModal.nextStatus === 'CLOSED'
                    ? 'Sí, cerrar evento'
                    : 'Sí, abrir evento'}
              </button>
            </div>
          </div>
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
