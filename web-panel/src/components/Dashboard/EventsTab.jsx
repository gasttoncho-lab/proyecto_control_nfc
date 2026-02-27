import React from 'react'

export default function EventsTab({
  events,
  eventName,
  setEventName,
  onCreateEvent,
  onOpenStatusModal,
  eventStatusLoading,
}) {
  return (
    <div className="users-section">
      <div className="users-header">
        <h2>Eventos</h2>
      </div>

      <form className="device-form" onSubmit={onCreateEvent}>
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
                  onClick={() => onOpenStatusModal(event)}
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
  )
}
