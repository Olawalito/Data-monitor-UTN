export type Role = 'admin' | 'reader'
export interface Session { username: string; role: Role }
export type SimStatus = 'pending' | 'fresh' | 'stale' | 'error'
export interface SimRecord {
  id: string; label: string; msisdn: string
  balance: number | null; balanceUnit: string | null; expiresAt: string | null
  lastAttemptAt: string | null; lastSuccessAt: string | null
  status: SimStatus; errorCode: string | null
}
export interface ApiErrorBody { error?: { code?: string; message?: string } }
