import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ── Axios interceptor: auto-refresh on 401 ────────────────────────────────

let _refreshing = false
let _refreshSubscribers = []

function onRefreshed(newToken) {
  _refreshSubscribers.forEach((cb) => cb(newToken))
  _refreshSubscribers = []
}

axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const status   = error.response?.status

    // Skip refresh for auth endpoints themselves
    if (status !== 401 || original._retry || original.url?.includes('/auth/')) {
      return Promise.reject(error)
    }

    original._retry = true

    if (_refreshing) {
      // Queue the request until refresh completes
      return new Promise((resolve) => {
        _refreshSubscribers.push((token) => {
          original.headers['Authorization'] = `Bearer ${token}`
          resolve(axios(original))
        })
      })
    }

    _refreshing = true
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) throw new Error('No refresh token')

      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken })
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)

      axios.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
      original.headers['Authorization'] = `Bearer ${data.access_token}`

      onRefreshed(data.access_token)
      return axios(original)
    } catch (_) {
      // Refresh failed → force logout
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      window.location.reload()
      return Promise.reject(error)
    } finally {
      _refreshing = false
    }
  }
)
