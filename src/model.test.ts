import { expect, test } from 'vitest'
import { addMaterial, initialState, moveMaterial, normalizeLink, removeMaterial, sanitizeState, setHonorific, setInUse, updateMaterial, validateInput, type AppState, type Material, type MaterialInput } from './model'

const input = (overrides: Partial<MaterialInput> = {}): MaterialInput => ({ category: '', name: 'A', shop: '', url: '', fixedText: '', requirement: 'unknown', ...overrides })
const material = (id: string, overrides: Partial<Material> = {}): Material => ({ id, category: '', name: id.toUpperCase(), shop: 'S', url: '', fixedText: '', requirement: 'unknown', inUse: true, ...overrides })

test('validateInput trims, requires only name', () => {
  expect(validateInput(input({ name: '  ' }))).toEqual({ ok: false, error: 'name-required' })
  expect(validateInput(input({ category: ' BGM ', name: ' A ', shop: ' ', fixedText: ' x\r\ny ', requirement: 'required' }))).toEqual({ ok: true, value: input({ category: 'BGM', fixedText: 'x\ny', requirement: 'required' }) })
})
test('validateInput falls back to unknown requirement', () => {
  expect(validateInput(input({ requirement: 'zzz' as never }))).toEqual({ ok: true, value: input() })
})
test('validateInput normalizes or rejects link', () => {
  expect(validateInput(input({ url: 'https://booth.pm/ja/items/1?x=1' }))).toEqual({ ok: true, value: input({ url: 'https://booth.pm/ja/items/1' }) })
  expect(validateInput(input({ url: ' @tsuzuri_naoto ' }))).toEqual({ ok: true, value: input({ url: '@tsuzuri_naoto' }) })
  expect(validateInput(input({ url: 'abc' }))).toEqual({ ok: false, error: 'link-invalid' })
})
test('normalizeLink accepts X handles only in the valid shape', () => {
  expect(normalizeLink('')).toBe('')
  expect(normalizeLink('@a_1')).toBe('@a_1')
  for (const bad of ['@', '@has space', '@toolonghandle1234', '@名前']) expect(normalizeLink(bad)).toBeNull()
})
test('addMaterial appends with new id, in use', () => {
  expect(addMaterial(initialState, input({ shop: 'B' }), () => 'x1')).toEqual({ ok: true, value: { ...initialState, materials: [material('x1', { name: 'A', shop: 'B' })] } })
  expect(initialState.materials).toHaveLength(0)
})
test('addMaterial rejects invalid input', () => {
  expect(addMaterial(initialState, input({ name: '' }), () => 'x1')).toEqual({ ok: false, error: 'name-required' })
})
test('update remove move keep inUse', () => {
  const state: AppState = { ...initialState, materials: ['a', 'b', 'c'].map(id => material(id)) }
  state.materials[1] = { ...state.materials[1], inUse: false }
  const original = structuredClone(state)
  const updated = updateMaterial(state, 'b', input({ name: 'B2', shop: 'S' }))
  expect(updated).toEqual({ ok: true, value: { ...state, materials: [state.materials[0], material('b', { name: 'B2', inUse: false }), state.materials[2]] } })
  expect(removeMaterial(state, 'b').materials.map(m => m.id)).toEqual(['a', 'c'])
  expect(moveMaterial(state, 'c', -1).materials.map(m => m.id)).toEqual(['a', 'c', 'b'])
  expect(moveMaterial(state, 'a', -1)).toBe(state)
  expect(updateMaterial(state, 'unknown', input({ name: 'X' }))).toEqual({ ok: true, value: state })
  expect(state).toEqual(original)
})
test('setInUse for one or all, setHonorific', () => {
  const state: AppState = { ...initialState, materials: ['a', 'b'].map(id => material(id)) }
  expect(setInUse(state, 'a', false).materials.map(m => m.inUse)).toEqual([false, true])
  expect(setInUse(state, null, false).materials.map(m => m.inUse)).toEqual([false, false])
  expect(setHonorific(state, true).honorific).toBe(true)
})
test('sanitizeState keeps valid version 2 materials only', () => {
  const good = material('a', { category: 'BGM', requirement: 'required', inUse: false, fixedText: 'BGM: x' })
  expect(sanitizeState({ version: 2, materials: [good, { ...good, id: 1 }, { ...good, requirement: 'zzz' }, { ...good, inUse: 'yes' }, null], templateId: 'zzz', honorific: 'yes', extra: 1 })).toEqual({ version: 2, materials: [good], templateId: 'standard', honorific: false })
  expect(sanitizeState({ version: 2, materials: [], templateId: 'bycategory', honorific: true })).toEqual({ version: 2, materials: [], templateId: 'bycategory', honorific: true })
  for (const raw of [null, [], { version: 3, materials: [] }, { version: 2 }]) expect(sanitizeState(raw)).toBeNull()
})
test('sanitizeState migrates version 1 and keeps honorific on', () => {
  expect(sanitizeState({ version: 1, materials: [{ id: 'a', name: 'A', shop: 'S', url: '' }, { id: 1 }], templateId: 'byshop' })).toEqual({ version: 2, materials: [material('a')], templateId: 'byshop', honorific: true })
})
