import React from 'react'

export const localDateTimeToUtcIso = (value, boundary = 'start') => {
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

export const toReportApiDate = (value, boundary = 'start') => {
  if (!value) return undefined

  const normalized = value.length === 10
    ? `${value}T${boundary === 'end' ? '23:59:59.999' : '00:00:00.000'}`
    : value

  return localDateTimeToUtcIso(normalized)
}

export const renderRawCents = (value) => (value === null || value === undefined ? '—' : `${value}`)

export const truncateText = (value, size = 10) => {
  if (!value) return '—'
  const text = `${value}`
  return text.length > size ? `${text.slice(0, size)}…` : text
}

export const truncateId = (value, head = 8, tail = 5) => {
  if (!value) return '—'
  const text = `${value}`
  if (text.length <= head + tail + 1) return text
  return `${text.slice(0, head)}…${text.slice(-tail)}`
}

export const copyToClipboard = async (value, label, setSuccess, setError) => {
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

export const renderCopyableId = (value, label, onCopy) => {
  if (!value) return <span title="Sin dato">—</span>
  const fullValue = `${value}`
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
      <span title={fullValue}>{truncateId(fullValue, 8, 4)}</span>
      <button
        type="button"
        className="btn-small"
        style={{ padding: '2px 8px', lineHeight: 1 }}
        onClick={() => onCopy(fullValue, label)}
        title={`Copiar ${label}`}
      >
        📋
      </button>
    </div>
  )
}
