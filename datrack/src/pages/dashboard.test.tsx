import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { api } from '../api/client'
import Dashboard from './dashboard'

const mockUseAuth = vi.fn()
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => mockUseAuth() }))
vi.mock('../api/client', () => ({
  api: { listSims: vi.fn(), addSim: vi.fn(), removeSim: vi.fn(), refreshSim: vi.fn(), refreshAll: vi.fn() },
  ApiRequestError: class extends Error {},
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue({ session: { username: 'admin', role: 'admin' }, logout: vi.fn() })
})

test('renders loading then an empty approved-line state', async () => {
  vi.mocked(api.listSims).mockResolvedValue([])
  render(<Dashboard />)
  expect(screen.getByText(/loading approved lines/i)).toBeInTheDocument()
  expect(await screen.findByText(/no approved SIMs yet/i)).toBeInTheDocument()
})

test('admin can add a SIM and refresh all balances', async () => {
  const user = userEvent.setup()
  vi.mocked(api.listSims).mockResolvedValue([])
  vi.mocked(api.addSim).mockResolvedValue({ id: '1', label: 'Main router', msisdn: '+2348031234567', balance: null, balanceUnit: null, expiresAt: null, lastAttemptAt: null, lastSuccessAt: null, status: 'pending', errorCode: null })
  vi.mocked(api.refreshAll).mockResolvedValue([])
  render(<Dashboard />)

  await user.click(await screen.findByRole('button', { name: /add sim/i }))
  await user.type(screen.getByLabelText('Line label'), 'Main router')
  await user.type(screen.getByLabelText('MTN number'), '08031234567')
  await user.click(screen.getByRole('button', { name: /save sim/i }))
  expect(api.addSim).toHaveBeenCalledWith('Main router', '08031234567')

  await user.click(screen.getByRole('button', { name: /refresh all/i }))
  expect(api.refreshAll).toHaveBeenCalled()
})

test('reader sees masked data with no modifying controls', async () => {
  mockUseAuth.mockReturnValue({ session: { username: 'viewer', role: 'reader' }, logout: vi.fn() })
  vi.mocked(api.listSims).mockResolvedValue([{ id: '1', label: 'Main router', msisdn: '••••••••4567', balance: 2, balanceUnit: 'GB', expiresAt: null, lastAttemptAt: null, lastSuccessAt: null, status: 'fresh', errorCode: null }])
  render(<Dashboard />)

  expect(await screen.findByText('••••••••4567')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /add sim/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /refresh all/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
})
