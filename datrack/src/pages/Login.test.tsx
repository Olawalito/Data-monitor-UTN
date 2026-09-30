import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import Login from './Login'
import { AuthProvider } from '../auth/AuthProvider'

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<div>Dashboard loaded</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

test('signs in through the API and navigates to the dashboard', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(response(401, { error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } }))
    .mockResolvedValueOnce(response(200, { data: { username: 'admin', role: 'admin' } }))
  vi.stubGlobal('fetch', fetchMock)
  const user = userEvent.setup()
  renderLogin()

  await user.type(await screen.findByLabelText('Username'), 'admin')
  await user.type(screen.getByLabelText('Password'), 'company password')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))

  assertRequest(fetchMock, 1, '/api/auth/login', {
    username: 'admin',
    password: 'company password',
  })
  expect(await screen.findByText('Dashboard loaded')).toBeInTheDocument()
})

test('shows a safe login failure and keeps the user on the form', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(response(401, { error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } }))
    .mockResolvedValueOnce(response(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' } })))
  const user = userEvent.setup()
  renderLogin()

  await user.type(await screen.findByLabelText('Username'), 'admin')
  await user.type(screen.getByLabelText('Password'), 'wrong')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password.')
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
})

test('contains no account creation or OTP controls', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401, { error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } })))
  renderLogin()

  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  expect(screen.queryByText(/create account/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/otp/i)).not.toBeInTheDocument()
})

function assertRequest(mock: ReturnType<typeof vi.fn>, index: number, url: string, body: unknown) {
  expect(mock.mock.calls[index][0]).toBe(url)
  expect(JSON.parse(mock.mock.calls[index][1].body)).toEqual(body)
}
