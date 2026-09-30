import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { api } from '../api/client'
import Dashboard from './dashboard'
const invalidate = vi.fn()
const mockUseAuth = vi.fn()
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => mockUseAuth() }))
vi.mock('../api/client', () => ({
  api: { listSims: vi.fn(), addSim: vi.fn(), removeSim: vi.fn(), refreshSim: vi.fn(), refreshAll: vi.fn() },
  ApiRequestError: class extends Error {
    status: number
    code: string
    constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code }
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue({ session: { username: 'admin', role: 'admin' }, logout: vi.fn(), invalidate })
})

afterEach(() => vi.useRealTimers())

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
  mockUseAuth.mockReturnValue({ session: { username: 'viewer', role: 'reader' }, logout: vi.fn(), invalidate })
  vi.mocked(api.listSims).mockResolvedValue([{ id: '1', label: 'Main router', msisdn: '••••••••4567', balance: 2, balanceUnit: 'GB', expiresAt: null, lastAttemptAt: null, lastSuccessAt: null, status: 'fresh', errorCode: null }])
  render(<Dashboard />)

  expect(await screen.findByText('••••••••4567')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /add sim/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /refresh all/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
})

test('polls for updated balances so read-only users see scheduled refreshes', async () => {
  vi.useFakeTimers()
  vi.mocked(api.listSims)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: '1', label: 'Company line', msisdn: '+2348135692193', balance: 5, balanceUnit: 'GB', expiresAt: null, lastAttemptAt: null, lastSuccessAt: null, status: 'fresh', errorCode: null }])
  render(<Dashboard />)
  await act(async () => {})
  expect(screen.getByText(/no approved SIMs yet/i)).toBeInTheDocument()

  await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })

  expect(screen.getByText('Company line')).toBeInTheDocument()
  expect(api.listSims).toHaveBeenCalledTimes(2)
})

test('invalidates the local session when an API request returns 401', async () => {
  const { ApiRequestError } = await import('../api/client')
  vi.mocked(api.listSims).mockRejectedValue(new ApiRequestError(401, 'UNAUTHENTICATED', 'Authentication required.'))

  render(<Dashboard />)

  await act(async () => {})
  expect(invalidate).toHaveBeenCalled()
})
