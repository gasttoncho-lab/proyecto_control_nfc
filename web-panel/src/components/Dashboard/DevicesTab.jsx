import React from 'react'

export default function DevicesTab({
  devices,
  deviceForm,
  setDeviceForm,
  users,
  openEvents,
  deviceBooths,
  onAuthorize,
  onRevoke,
  onReauthorize,
  onDelete,
  fetchDeviceBooths,
}) {
  return (
    <div className="users-section">
      <div className="users-header">
        <h2>Dispositivos Autorizados</h2>
      </div>

      <form className="device-form" onSubmit={onAuthorize}>
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
                    onClick={() => onRevoke(device.deviceId)}
                  >
                    🚫 Revocar
                  </button>
                )}
                {device.status === 'REVOKED' && (
                  <button
                    className="btn-small btn-edit"
                    onClick={() => onReauthorize(device)}
                  >
                    ♻️ Reautorizar
                  </button>
                )}
                <button
                  className="btn-small btn-delete"
                  onClick={() => onDelete(device.deviceId)}
                >
                  🗑️ Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
