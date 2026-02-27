import React from 'react'

export default function BoothProductsTab({
  events,
  assignmentEventId,
  assignmentBoothId,
  assignmentBooths,
  boothProducts,
  onEventChange,
  onBoothChange,
  onToggle,
  onSave,
}) {
  return (
    <div className="users-section">
      <div className="users-header">
        <h2>Booth → Productos</h2>
      </div>

      <form className="device-form" onSubmit={onSave}>
        <div className="form-row">
          <div className="form-group">
            <label>Evento</label>
            <select
              value={assignmentEventId}
              onChange={(e) => onEventChange(e.target.value)}
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
              onChange={(e) => onBoothChange(e.target.value)}
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
                onChange={() => onToggle(product.id)}
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
  )
}
