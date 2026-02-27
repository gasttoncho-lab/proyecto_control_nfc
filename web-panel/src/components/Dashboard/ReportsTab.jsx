import React from 'react'
import { renderRawCents, truncateId } from '../../utils.jsx'

function renderAdminActionDetail(item) {
  const r = item.resultJson ?? {}
  switch (r.code) {
    case 'ADMIN_RESYNC':
      return `CTR: ${r.fromCtr} → ${r.toCtr}`
    case 'ADMIN_INVALIDATE':
      return `Motivo: ${r.reason ?? '-'}`
    case 'ADMIN_INVALIDATE_AFTER_REPLACE':
      return `Reemplazo: ${truncateId(r.fromWristbandId)} → ${truncateId(r.toWristbandId)}`
    case 'ADMIN_REPLACE_TRANSFER':
      return `${r.direction}: ${truncateId(r.fromWristbandId)} → ${truncateId(r.toWristbandId)}`
    case 'ADMIN_REFUND':
      return `TX: ${truncateId(r.originalTransactionId)}`
    default:
      return '-'
  }
}

export default function ReportsTab({
  events,
  reportsEventId,
  reportsSummary,
  reportsByBooth,
  reportsByProduct,
  reportTransactions,
  reportPagination,
  reportFilters,
  setReportFilters,
  reportsLoading,
  reportsView,
  setReportsView,
  incidentFilters,
  setIncidentFilters,
  incidents,
  incidentPagination,
  incidentsLoading,
  refundingTxId,
  csvExporting,
  csvProductsExporting,
  boothNameById,
  totalReportPages,
  hasPrevReportPage,
  hasNextReportPage,
  totalIncidentPages,
  hasActiveReportFilters,
  handleReportsEventChange,
  handleApplyReportFilters,
  handleClearReportFilters,
  handleReportPrevPage,
  handleReportNextPage,
  handleIncidentPageChange,
  handleRefund,
  handleExportCsv,
  handleExportProductsCsv,
  handleApplyIncidentFilters,
  handleIncidentResync,
  handleIncidentInvalidate,
  incidentNeedsReplace,
  openReplaceModal,
  renderCopyableId,
  adminActions,
  adminActionsPagination,
  adminActionsLoading,
  adminActionsFilters,
  setAdminActionsFilters,
  totalAdminActionsPages,
  handleApplyAdminActionsFilters,
  handleAdminActionsPageChange,
}) {
  return (
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
          <button
            type="button"
            className="btn-small"
            style={{ opacity: reportsView === 'acciones' ? 1 : 0.7 }}
            onClick={() => setReportsView('acciones')}
          >
            Acciones admin
          </button>
        </div>
        <button
          className="btn-add"
          onClick={handleExportCsv}
          disabled={!reportsSummary || reportsSummary.totalCents <= 0 || csvExporting}
          style={{ opacity: (!reportsSummary || reportsSummary.totalCents <= 0) ? 0.6 : 1 }}
        >
          {csvExporting ? '⏳ Exportando...' : '⬇️ Exportar CSV'}
        </button>
        <button
          className="btn-add"
          onClick={handleExportProductsCsv}
          disabled={!reportsEventId || csvProductsExporting}
          style={{ opacity: !reportsEventId ? 0.6 : 1 }}
        >
          {csvProductsExporting ? '⏳ Exportando...' : '⬇️ Export CSV (Productos)'}
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
                <th>Tipo</th>
                <th>Monto (centavos)</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
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
                  <td>{tx.type || '-'}</td>
                  <td>{renderRawCents(tx.amountCents)}</td>
                  <td>{tx.status}</td>
                  <td>{new Date(tx.createdAt).toLocaleString()}</td>
                  <td>
                    {tx.type === 'CHARGE' && tx.status === 'APPROVED' && (
                      <button
                        type="button"
                        className="btn-small btn-delete"
                        disabled={refundingTxId === tx.id}
                        onClick={() => handleRefund(tx)}
                      >
                        {refundingTxId === tx.id ? 'Procesando...' : 'Reembolsar'}
                      </button>
                    )}
                  </td>
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
                  <th>Saldo actual</th>
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
                    <td style={{ fontWeight: 600 }}>
                      {incident.balanceCents != null ? renderRawCents(incident.balanceCents) : '—'}
                    </td>
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

      {reportsView === 'acciones' && (
        <>
          <form className="device-form" onSubmit={handleApplyAdminActionsFilters}>
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
                  value={adminActionsFilters.wristbandId}
                  onChange={(e) => setAdminActionsFilters((prev) => ({ ...prev, wristbandId: e.target.value }))}
                  placeholder="UUID pulsera"
                />
              </div>
              <div className="form-group">
                <label>Desde</label>
                <input
                  type="datetime-local"
                  value={adminActionsFilters.from}
                  onChange={(e) => setAdminActionsFilters((prev) => ({ ...prev, from: e.target.value || '' }))}
                />
              </div>
              <div className="form-group">
                <label>Hasta</label>
                <input
                  type="datetime-local"
                  value={adminActionsFilters.to}
                  onChange={(e) => setAdminActionsFilters((prev) => ({ ...prev, to: e.target.value || '' }))}
                />
              </div>
            </div>
            <button className="btn-add" type="submit" disabled={!reportsEventId || adminActionsLoading}>
              🔍 Buscar acciones
            </button>
          </form>

          {adminActionsLoading && <p style={{ marginBottom: '12px' }}>Cargando acciones...</p>}

          <div className="incidents-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Fecha/hora</th>
                  <th>Acción</th>
                  <th>wristbandId</th>
                  <th>Detalle</th>
                  <th>Saldo actual</th>
                  <th>Admin (userId)</th>
                </tr>
              </thead>
              <tbody>
                {adminActions.map((item) => (
                  <tr key={`${item.eventId}-${item.id}`}>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                    <td><strong>{item.adminCode || item?.resultJson?.code || '—'}</strong></td>
                    <td>{renderCopyableId(item.wristbandId, 'wristbandId')}</td>
                    <td style={{ fontSize: '13px', color: '#555' }}>{renderAdminActionDetail(item)}</td>
                    <td style={{ fontWeight: 600 }}>
                      {item.balanceCents != null ? renderRawCents(item.balanceCents) : '—'}
                    </td>
                    <td style={{ fontSize: '12px', color: '#888' }}>
                      {truncateId(item.byUserId || item?.resultJson?.byUserId)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {adminActions.length === 0 && reportsEventId && (
            <p style={{ textAlign: 'center', color: '#999', padding: '10px' }}>Sin acciones admin para este evento</p>
          )}

          {adminActionsPagination.total > adminActionsPagination.limit && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-small"
                disabled={adminActionsPagination.page <= 1 || adminActionsLoading}
                onClick={() => handleAdminActionsPageChange(adminActionsPagination.page - 1)}
              >
                ← Anterior
              </button>
              <span style={{ alignSelf: 'center' }}>{adminActionsPagination.page} / {totalAdminActionsPages}</span>
              <button
                type="button"
                className="btn-small"
                disabled={adminActionsPagination.page >= totalAdminActionsPages || adminActionsLoading}
                onClick={() => handleAdminActionsPageChange(adminActionsPagination.page + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
