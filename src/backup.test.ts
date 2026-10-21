import { expect, test } from 'vitest'
import { backupFileName, parseBackup, serializeBackup } from './backup'
import type { AppState, Material } from './model'

const m = (id: string, overrides: Partial<Material>): Material => ({ id, category: '', name: id, shop: '', url: '', fixedText: '', requirement: 'unknown', inUse: true, ...overrides })

test('backup round trip', () => {
  const state: AppState = { version: 2, materials: [
    m('a', { category: '立ち絵', name: 'ゆるふわ立ち絵セット', shop: 'ねこ工房', url: 'https://booth.pm/ja/items/1234567', requirement: 'required' }),
    m('b', { name: '夜のBGM集', shop: 'おとや', url: '@otoya', fixedText: 'BGM: おとや', inUse: false }),
  ], templateId: 'bycategory', honorific: false }
  const text = serializeBackup(state, new Date('2026-10-11T00:05:00Z'))
  expect(JSON.parse(text)).toEqual({ app: 'sozai-credit', format: 2, exportedAt: '2026-10-11T00:05:00.000Z', state })
  let n = 0
  expect(parseBackup(text, () => `n${++n}`)).toEqual({ ok: true, value: { ...state, materials: state.materials.map((material, i) => ({ ...material, id: `n${i + 1}` })) } })
  expect(state.materials.map(material => material.id)).toEqual(['a', 'b'])
})
test('backup reads version 1 files', () => {
  const text = JSON.stringify({ app: 'sozai-credit', format: 1, exportedAt: '2026-10-11T00:05:00.000Z', state: { version: 1, materials: [{ id: 'a', name: 'A', shop: 'S', url: '' }], templateId: 'oneline' } })
  expect(parseBackup(text, () => 'new')).toEqual({ ok: true, value: { version: 2, materials: [m('new', { name: 'A', shop: 'S' })], templateId: 'oneline', honorific: true } })
})
test('backup rejects bad files', () => {
  expect(parseBackup('{', () => 'x')).toEqual({ ok: false, error: 'invalid-json' })
  for (const text of ['null', '[]', '{"app":"other","format":2,"state":{"version":2,"materials":[],"templateId":"standard"}}', '{"app":"sozai-credit","format":3,"state":{}}', '{"app":"sozai-credit","format":2,"state":{"version":2}}', '{"app":"sozai-credit","format":1,"state":{"version":2,"materials":[]}}']) {
    expect(parseBackup(text, () => 'x')).toEqual({ ok: false, error: 'not-backup' })
  }
})
test('backupFileName pads local time', () => { expect(backupFileName(new Date(2026, 9, 1, 9, 5))).toBe('sozai-credit-20261001-0905.json') })

test('backup rejects partially malformed materials', () => {
  const text = JSON.stringify({ app: 'sozai-credit', format: 2, state: { version: 2, materials: [m('a', {}), { ...m('b', {}), requirement: 'zzz' }], templateId: 'standard', honorific: false } })
  let calls = 0
  expect(parseBackup(text, () => { calls++; return 'new' })).toEqual({ ok: false, error: 'not-backup' })
  expect(calls).toBe(0)
})
test('backup rejects entirely malformed materials', () => {
  for (const material of [{ ...m('a', {}), id: 1 }, { ...m('a', {}), name: null }, { ...m('a', {}), shop: 1 }, { ...m('a', {}), url: false }, { ...m('a', {}), inUse: 'yes' }, { ...m('a', {}), category: 1 }, null]) {
    const text = JSON.stringify({ app: 'sozai-credit', format: 2, state: { version: 2, materials: [material], templateId: 'standard', honorific: false } })
    expect(parseBackup(text, () => 'new')).toEqual({ ok: false, error: 'not-backup' })
  }
})
