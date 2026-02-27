import React from 'react'

export default function BoothsTab({
  boothForm,
  setBoothForm,
  events,
  boothsByEvent,
  boothEdits,
  selectedBoothEventId,
  setSelectedBoothEventId,
  onCreateBooth,
  onEditChange,
  onSave,
  fetchBoothsByEvent,
}) {
  return (
    <div className="users-section">
      <div className="users-header">
        <h2>Booths</h2>
      </div>

      <form className="device-form" onSubmit={onCreateBooth}>
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
                  onChange={(e) => onEditChange(booth.id, 'name', e.target.value)}
                />
              </td>
              <td>
                <select
                  value={boothEdits[booth.id]?.status || 'ACTIVE'}
                  onChange={(e) => onEditChange(booth.id, 'status', e.target.value)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </td>
              <td>{new Date(booth.createdAt).toLocaleDateString()}</td>
              <td>
                <button className="btn-small btn-edit" onClick={() => onSave(booth.id)}>
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
  )
}
