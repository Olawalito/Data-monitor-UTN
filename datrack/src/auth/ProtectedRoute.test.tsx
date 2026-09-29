import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthProvider'
import ProtectedRoute from './ProtectedRoute'

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function Harness() {
  const { session, logout } = useAuth()
  return <div><span>{session?.role}</span><button onClick={logout}>Log out</button></div>
}

function renderRoutes(initial = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<div>Login screen</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Harness />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

test('restores a valid session before rendering the protected route', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, { data: { username: 'reader', role: 'reader' } })))
  renderRoutes()

  expect(await screen.findByText('reader')).toBeInTheDocument()
  expect(screen.queryByText('Login screen')).not.toBeInTheDocument()
})

test('redirects an unauthenticated session to login', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401, { error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } })))
  renderRoutes()

  expect(await screen.findByText('Login screen')).toBeInTheDocument()
})

test('logs out and redirects the protected route', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(response(200, { data: { username: 'admin', role: 'admin' } }))
    .mockResolvedValueOnce(response(200, { data: { signedOut: true } })))
  const user = userEvent.setup()
  renderRoutes()

  await user.click(await screen.findByRole('button', { name: 'Log out' }))
  expect(await screen.findByText('Login screen')).toBeInTheDocument()
})
