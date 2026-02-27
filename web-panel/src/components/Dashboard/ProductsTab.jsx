import React from 'react'

export default function ProductsTab({
  productForm,
  setProductForm,
  events,
  productsByEvent,
  productEdits,
  selectedProductEventId,
  setSelectedProductEventId,
  onCreateProduct,
  onEditChange,
  onSave,
  fetchProductsByEvent,
}) {
  return (
    <div className="users-section">
      <div className="users-header">
        <h2>Productos</h2>
      </div>

      <form className="device-form" onSubmit={onCreateProduct}>
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
                  onChange={(e) => onEditChange(product.id, 'name', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={productEdits[product.id]?.priceCents ?? ''}
                  onChange={(e) => onEditChange(product.id, 'priceCents', e.target.value)}
                />
              </td>
              <td>
                <select
                  value={productEdits[product.id]?.status || 'ACTIVE'}
                  onChange={(e) => onEditChange(product.id, 'status', e.target.value)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </td>
              <td>{new Date(product.createdAt).toLocaleDateString()}</td>
              <td>
                <button
                  className="btn-small btn-edit"
                  onClick={() => onSave(product.id)}
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
  )
}
