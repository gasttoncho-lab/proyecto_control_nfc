import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { API_URL } from '../../api.js'
import {
  localDateTimeToUtcIso,
  toReportApiDate,
  copyToClipboard as copyToClipboardUtil,
  renderCopyableId as renderCopyableIdUtil,
} from '../../utils.jsx'
import UserModal from '../UserModal.jsx'
import UsersTab from './UsersTab.jsx'
import EventsTab from './EventsTab.jsx'
import DevicesTab from './DevicesTab.jsx'
import BoothsTab from './BoothsTab.jsx'
import ProductsTab from './ProductsTab.jsx'
import BoothProductsTab from './BoothProductsTab.jsx'
import ReportsTab from './ReportsTab.jsx'

const REPORTS_DEFAULT_LIMIT = 20

export default function Dashboard({ token, onLogout }) {
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
  const [refundingTxId, setRefundingTxId] = useState(null)

  useEffect(() => {
    fetchUsers()
    fetchEvents()
    fetchOpenEvents()
    fetchDevices()
  }, [])

  // ── Fetch functions ──────────────────────────────────────────────────────

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

  // ── User handlers ────────────────────────────────────────────────────────

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

  // ── Event handlers ───────────────────────────────────────────────────────

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

  // ── Device handlers ──────────────────────────────────────────────────────

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

  // ── Booth handlers ───────────────────────────────────────────────────────

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

  // ── Product handlers ─────────────────────────────────────────────────────

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

  // ── Booth-Products handlers ──────────────────────────────────────────────

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

  // ── Reports handlers ─────────────────────────────────────────────────────

  const getReportQueryParams = (page = 1, filters = appliedReportFilters, limit = reportPagination.limit) => {
    return {
      boothId: filters.boothId || undefined,
      from: toReportApiDate(filters.from, 'start'),
      to: toReportApiDate(filters.to, 'end'),
      page,
      limit,
    }
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

  const handleRefund = async (tx) => {
    if (!window.confirm(`¿Reembolsar $${(tx.amountCents / 100).toFixed(2)} al saldo de la pulsera?\nEsto no se puede deshacer.`)) return
    setRefundingTxId(tx.id)
    try {
      await axios.post(
        `${API_URL}/admin/transactions/${tx.id}/refund`,
        { eventId: tx.eventId },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setSuccess('Reembolso aplicado correctamente')
      setTimeout(() => setSuccess(''), 3000)
      await loadReportTransactionsPage(reportsEventId, reportPagination.page, appliedReportFilters)
    } catch (err) {
      const code = err.response?.data?.message || err.response?.data?.code || 'Error al reembolsar'
      setError(typeof code === 'string' ? code : JSON.stringify(code))
      setTimeout(() => setError(''), 4000)
    } finally {
      setRefundingTxId(null)
    }
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

  // ── Incidents handlers ───────────────────────────────────────────────────

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

  // ── Clipboard helpers ────────────────────────────────────────────────────

  const handleCopy = (value, label) => copyToClipboardUtil(value, label, setSuccess, setError)
  const renderCopyableId = (value, label) => renderCopyableIdUtil(value, label, handleCopy)

  // ── Derived values ───────────────────────────────────────────────────────

  const boothNameById = useMemo(
    () => new Map(reportsByBooth.map((row) => [row.boothId, row.boothName])),
    [reportsByBooth],
  )

  const totalReportPages = Math.max(1, Math.ceil(reportPagination.total / reportPagination.limit || 1))
  const hasPrevReportPage = reportPagination.page > 1
  const hasNextReportPage = reportPagination.page < totalReportPages
  const totalIncidentPages = Math.max(1, Math.ceil(incidentPagination.total / incidentPagination.limit || 1))

  // ── Render ───────────────────────────────────────────────────────────────

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
        <UsersTab
          users={users}
          onAdd={handleAddUser}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
        />
      )}

      {activeTab === 'events' && (
        <EventsTab
          events={events}
          eventName={eventName}
          setEventName={setEventName}
          onCreateEvent={handleCreateEvent}
          onOpenStatusModal={openEventStatusModal}
          eventStatusLoading={eventStatusLoading}
        />
      )}

      {activeTab === 'devices' && (
        <DevicesTab
          devices={devices}
          deviceForm={deviceForm}
          setDeviceForm={setDeviceForm}
          users={users}
          openEvents={openEvents}
          deviceBooths={deviceBooths}
          onAuthorize={handleAuthorizeDevice}
          onRevoke={handleRevokeDevice}
          onReauthorize={handleReauthorizeDevice}
          onDelete={handleDeleteDevice}
          fetchDeviceBooths={fetchDeviceBooths}
        />
      )}

      {activeTab === 'booths' && (
        <BoothsTab
          boothForm={boothForm}
          setBoothForm={setBoothForm}
          events={events}
          boothsByEvent={boothsByEvent}
          boothEdits={boothEdits}
          selectedBoothEventId={selectedBoothEventId}
          setSelectedBoothEventId={setSelectedBoothEventId}
          onCreateBooth={handleCreateBooth}
          onEditChange={handleBoothEditChange}
          onSave={handleSaveBooth}
          fetchBoothsByEvent={fetchBoothsByEvent}
        />
      )}

      {activeTab === 'products' && (
        <ProductsTab
          productForm={productForm}
          setProductForm={setProductForm}
          events={events}
          productsByEvent={productsByEvent}
          productEdits={productEdits}
          selectedProductEventId={selectedProductEventId}
          setSelectedProductEventId={setSelectedProductEventId}
          onCreateProduct={handleCreateProduct}
          onEditChange={handleProductEditChange}
          onSave={handleSaveProduct}
          fetchProductsByEvent={fetchProductsByEvent}
        />
      )}

      {activeTab === 'booth-products' && (
        <BoothProductsTab
          events={events}
          assignmentEventId={assignmentEventId}
          assignmentBoothId={assignmentBoothId}
          assignmentBooths={assignmentBooths}
          boothProducts={boothProducts}
          onEventChange={handleAssignmentEventChange}
          onBoothChange={handleAssignmentBoothChange}
          onToggle={handleToggleBoothProduct}
          onSave={handleSaveBoothProducts}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsTab
          events={events}
          reportsEventId={reportsEventId}
          reportsSummary={reportsSummary}
          reportsByBooth={reportsByBooth}
          reportsByProduct={reportsByProduct}
          reportTransactions={reportTransactions}
          reportPagination={reportPagination}
          reportFilters={reportFilters}
          setReportFilters={setReportFilters}
          reportsLoading={reportsLoading}
          reportsView={reportsView}
          setReportsView={setReportsView}
          incidentFilters={incidentFilters}
          setIncidentFilters={setIncidentFilters}
          incidents={incidents}
          incidentPagination={incidentPagination}
          incidentsLoading={incidentsLoading}
          refundingTxId={refundingTxId}
          boothNameById={boothNameById}
          totalReportPages={totalReportPages}
          hasPrevReportPage={hasPrevReportPage}
          hasNextReportPage={hasNextReportPage}
          totalIncidentPages={totalIncidentPages}
          hasActiveReportFilters={hasActiveReportFilters}
          handleReportsEventChange={handleReportsEventChange}
          handleApplyReportFilters={handleApplyReportFilters}
          handleClearReportFilters={handleClearReportFilters}
          handleReportPrevPage={handleReportPrevPage}
          handleReportNextPage={handleReportNextPage}
          handleIncidentPageChange={handleIncidentPageChange}
          handleRefund={handleRefund}
          handleExportCsv={handleExportCsv}
          handleExportProductsCsv={handleExportProductsCsv}
          handleApplyIncidentFilters={handleApplyIncidentFilters}
          handleIncidentResync={handleIncidentResync}
          handleIncidentInvalidate={handleIncidentInvalidate}
          incidentNeedsReplace={incidentNeedsReplace}
          openReplaceModal={openReplaceModal}
          renderCopyableId={renderCopyableId}
        />
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
