import type { ApiErrorBody, Session, SimRecord } from '../types/api'

export class ApiRequestError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: init?.body ? { 'content-type': 'application/json', ...init.headers } : init?.headers,
  })
  const body = await response.json().catch(() => ({})) as { data?: T } & ApiErrorBody
  if (!response.ok) {
    throw new ApiRequestError(response.status, body.error?.code || 'REQUEST_FAILED', body.error?.message || 'The local service could not complete the request.')
  }
  return body.data as T
}

export const api = {
  getSession: () => request<Session>('/api/auth/session'),
  login: (username: string, password: string) => request<Session>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<{ signedOut: boolean }>('/api/auth/logout', { method: 'POST', body: '{}' }),
  listSims: () => request<SimRecord[]>('/api/sims'),
  addSim: (label: string, msisdn: string) => request<SimRecord>('/api/sims', { method: 'POST', body: JSON.stringify({ label, msisdn }) }),
  removeSim: (id: string) => request<{ removed: boolean }>(`/api/sims/${id}`, { method: 'DELETE', body: '{}' }),
  refreshSim: (id: string) => request<SimRecord>(`/api/sims/${id}/refresh`, { method: 'POST', body: '{}' }),
  refreshAll: () => request<SimRecord[]>('/api/sims/refresh', { method: 'POST', body: '{}' }),
}
