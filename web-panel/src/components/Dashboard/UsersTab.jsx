import React from 'react'

export default function UsersTab({ users, onAdd, onEdit, onDelete }) {
  return (
    <div className="users-section">
      <div className="users-header">
        <h2>Usuarios Registrados</h2>
        <button className="btn-add" onClick={onAdd}>
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
                  onClick={() => onEdit(user)}
                >
                  ✏️ Editar
                </button>
                <button
                  className="btn-small btn-delete"
                  onClick={() => onDelete(user.id)}
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
  )
}
