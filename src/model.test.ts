import { expect, test } from 'vitest'
import { addMaterial, initialState, moveMaterial, removeMaterial, sanitizeState, updateMaterial, validateInput, type AppState } from './model'

test('validateInput trims and requires name then shop', () => {
  expect(validateInput({ name: '  ', shop: '', url: '' })).toEqual({ ok: false, error: 'name-required' })
  expect(validateInput({ name: 'A', shop: ' ', url: '' })).toEqual({ ok: false, error: 'shop-required' })
  expect(validateInput({ name: ' A ', shop: ' B ', url: '' })).toEqual({ ok: true, value: { name: 'A', shop: 'B', url: '' } })
})
test('validateInput normalizes or rejects url', () => {
  expect(validateInput({ name: 'A', shop: 'B', url: 'https://booth.pm/ja/items/1?x=1' })).toEqual({ ok: true, value: { name: 'A', shop: 'B', url: 'https://booth.pm/ja/items/1' } })
  expect(validateInput({ name: 'A', shop: 'B', url: 'abc' })).toEqual({ ok: false, error: 'url-invalid' })
})
test('addMaterial appends with new id', () => {
  expect(addMaterial(initialState, { name: 'A', shop: 'B', url: '' }, () => 'x1')).toEqual({ ok: true, value: { ...initialState, materials: [{ id: 'x1', name: 'A', shop: 'B', url: '' }] } })
  expect(initialState.materials).toHaveLength(0)
})
test('addMaterial rejects invalid input', () => {
  expect(addMaterial(initialState, { name: '', shop: 'B', url: '' }, () => 'x1')).toEqual({ ok: false, error: 'name-required' })
})
test('update remove move', () => {
  const state: AppState = { ...initialState, materials: ['a', 'b', 'c'].map(id => ({ id, name: id.toUpperCase(), shop: 'S', url: '' })) }
  const original = structuredClone(state)
  const updated = updateMaterial(state, 'b', { name: 'B2', shop: 'S', url: '' })
  expect(updated).toEqual({ ok: true, value: { ...state, materials: [state.materials[0], { id: 'b', name: 'B2', shop: 'S', url: '' }, state.materials[2]] } })
  expect(removeMaterial(state, 'b').materials.map(m => m.id)).toEqual(['a', 'c'])
  expect(moveMaterial(state, 'c', -1).materials.map(m => m.id)).toEqual(['a', 'c', 'b'])
  expect(moveMaterial(state, 'a', -1)).toBe(state)
  expect(updateMaterial(state, 'unknown', { name: 'X', shop: 'S', url: '' })).toEqual({ ok: true, value: state })
  expect(state).toEqual(original)
})
test('sanitizeState keeps valid materials only', () => {
  expect(sanitizeState({ version: 1, materials: [{ id: 'a', name: 'A', shop: 'S', url: '' }, { id: 1 }, null], templateId: 'zzz', extra: 1 })).toEqual({ version: 1, materials: [{ id: 'a', name: 'A', shop: 'S', url: '' }], templateId: 'standard' })
  for (const raw of [null, [], { version: 2, materials: [] }]) expect(sanitizeState(raw)).toBeNull()
})
