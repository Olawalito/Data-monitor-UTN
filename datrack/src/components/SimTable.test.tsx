import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import type { SimRecord } from '../types/api'
import SimTable from './table'

const sims: SimRecord[] = [
  { id: '1', label: 'Operations router', msisdn: '+2348031234567', balance: 1536, balanceUnit: 'MB', expiresAt: '2026-10-10T00:00:00.000Z', lastAttemptAt: '2026-09-29T12:00:00.000Z', lastSuccessAt: '2026-09-29T12:00:00.000Z', status: 'fresh', errorCode: null },
  { id: '2', label: 'Field tablet', msisdn: '+2348060009999', balance: 4.5, balanceUnit: 'GB', expiresAt: null, lastAttemptAt: '2026-09-29T12:00:00.000Z', lastSuccessAt: '2026-09-28T12:00:00.000Z', status: 'stale', errorCode: 'MTN_TIMEOUT' },
  { id: '3', label: 'Backup line', msisdn: '+2348100001111', balance: null, balanceUnit: null, expiresAt: null, lastAttemptAt: '2026-09-29T12:00:00.000Z', lastSuccessAt: null, status: 'error', errorCode: 'MTN_AUTH_FAILED' },
]

test('renders formatted balances, expiry, and safe health states', () => {
  render(<SimTable sims={sims} role="reader" busyIds={new Set()} onRefresh={vi.fn()} onRemove={vi.fn()} />)
  expect(screen.getByText('1,536 MB')).toBeInTheDocument()
  expect(screen.getByText(/10 Oct 2026/)).toBeInTheDocument()
  expect(screen.getByText('Stale')).toBeInTheDocument()
  expect(screen.getByText('Needs attention')).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'Last successful' })).toBeInTheDocument()
  const staleRow = screen.getByRole('row', { name: /Field tablet/ })
  expect(within(staleRow).getByText(/28 Sept 2026/)).toBeInTheDocument()
  expect(within(staleRow).queryByText(/29 Sept 2026/)).not.toBeInTheDocument()
  expect(screen.getAllByText('Not available').length).toBeGreaterThan(0)
  expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
})

test('offers admin actions and confirms before removal', async () => {
  const user = userEvent.setup()
  const onRefresh = vi.fn()
  const onRemove = vi.fn()
  vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
  render(<SimTable sims={[sims[0]]} role="admin" busyIds={new Set()} onRefresh={onRefresh} onRemove={onRemove} />)

  await user.click(screen.getByRole('button', { name: /refresh operations router/i }))
  expect(onRefresh).toHaveBeenCalledWith('1')
  await user.click(screen.getByRole('button', { name: /remove operations router/i }))
  expect(onRemove).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: /remove operations router/i }))
  expect(onRemove).toHaveBeenCalledWith('1')
})
