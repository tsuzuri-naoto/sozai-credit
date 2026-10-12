import { sanitizeState, type AppState } from './model'

export const BACKUP_APP = 'sozai-credit'
export const BACKUP_FORMAT = 1
export type BackupFile = { app: 'sozai-credit'; format: 1; exportedAt: string; state: AppState }
export type BackupError = 'invalid-json' | 'not-backup'

export function serializeBackup(state: AppState, now: Date): string {
  return JSON.stringify({ app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: now.toISOString(), state }, null, 2)
}

export function parseBackup(text: string, newId: () => string): { ok: true; value: AppState } | { ok: false; error: BackupError } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid-json' }
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'not-backup' }
  const data = raw as Record<string, unknown>
  if (data.app !== BACKUP_APP || data.format !== BACKUP_FORMAT) return { ok: false, error: 'not-backup' }
  const state = sanitizeState(data.state)
  if (state === null) return { ok: false, error: 'not-backup' }
  const rawState = data.state as { materials: unknown[] }
  if (state.materials.length !== rawState.materials.length) return { ok: false, error: 'not-backup' }
  return { ok: true, value: { ...state, materials: state.materials.map(material => ({ ...material, id: newId() })) } }
}

export function backupFileName(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `sozai-credit-${String(now.getFullYear()).padStart(4, '0')}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`
}
