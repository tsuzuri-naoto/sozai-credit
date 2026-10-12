import { initialState, sanitizeState, type AppState } from './model'

export const STORAGE_KEY = 'sozai-credit:v1'
export type KeyValueStore = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export type AppStorage = { readonly available: boolean; load(): AppState; save(state: AppState): void }

export function createStorage(backend: KeyValueStore | null): AppStorage {
  let available = false
  if (backend !== null) {
    try {
      backend.setItem('sozai-credit:probe', '1')
      backend.removeItem('sozai-credit:probe')
      available = true
    } catch {
      available = false
    }
  }
  return {
    get available() { return available },
    load() {
      if (!available || backend === null) return initialState
      let text: string | null
      try {
        text = backend.getItem(STORAGE_KEY)
      } catch {
        available = false
        return initialState
      }
      if (text === null) return initialState
      try {
        return sanitizeState(JSON.parse(text)) ?? initialState
      } catch {
        return initialState
      }
    },
    save(state) {
      if (!available || backend === null) return
      const text = JSON.stringify(state)
      try {
        backend.setItem(STORAGE_KEY, text)
      } catch {
        available = false
      }
    },
  }
}
