import { expect, test } from 'vitest'
import { createStorage, STORAGE_KEY, type KeyValueStore } from './storage'
import { initialState, type AppState } from './model'

function mapBackend(): KeyValueStore {
  const map = new Map<string, string>()
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => { map.set(key, value) }, removeItem: key => { map.delete(key) } }
}
test('storage unavailable', () => {
  const throwing: KeyValueStore = { getItem: () => null, setItem: () => { throw new Error('denied') }, removeItem: () => {} }
  for (const backend of [null, throwing]) {
    const storage = createStorage(backend)
    expect(storage.available).toBe(false)
    expect(storage.load()).toEqual(initialState)
    expect(() => storage.save(initialState)).not.toThrow()
  }
})
test('storage round trip', () => {
  const state: AppState = { version: 1, materials: [{ id: 'a', name: 'A', shop: 'S1', url: '' }, { id: 'b', name: 'B', shop: 'S2', url: 'https://example.com' }], templateId: 'byshop' }
  const storage = createStorage(mapBackend())
  expect(storage.available).toBe(true)
  storage.save(state)
  expect(storage.load()).toEqual(state)
})
test('storage discards broken data', () => {
  for (const raw of [null, 'null', '[]', '5', '{', '{"version":2}']) {
    const backend = mapBackend()
    if (raw !== null) backend.setItem(STORAGE_KEY, raw)
    const storage = createStorage(backend)
    expect(storage.load()).toEqual(initialState)
    expect(storage.available).toBe(true)
  }
  const backend = mapBackend()
  backend.setItem(STORAGE_KEY, '{"version":1,"materials":[{"id":"a","name":"A","shop":"S","url":""},{"id":1}],"templateId":"zzz"}')
  expect(createStorage(backend).load()).toEqual({ version: 1, materials: [{ id: 'a', name: 'A', shop: 'S', url: '' }], templateId: 'standard' })
})

test('storage reports save failure after successful probe', () => {
  const backend = mapBackend()
  const originalSet = backend.setItem
  backend.setItem = (key, value) => {
    if (key === STORAGE_KEY) throw new Error('quota')
    originalSet(key, value)
  }
  const storage = createStorage(backend)
  expect(storage.available).toBe(true)
  expect(() => storage.save(initialState)).not.toThrow()
  expect(storage.available).toBe(false)
})
test('storage reports load failure after successful probe', () => {
  const backend = mapBackend()
  backend.getItem = () => { throw new Error('denied') }
  const storage = createStorage(backend)
  expect(storage.available).toBe(true)
  expect(storage.load()).toEqual(initialState)
  expect(storage.available).toBe(false)
})
