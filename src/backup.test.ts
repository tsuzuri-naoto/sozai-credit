import { expect, test } from 'vitest'
import { backupFileName, parseBackup, serializeBackup } from './backup'
import type { AppState } from './model'

test('backup round trip', () => {
  const state: AppState = { version: 1, materials: [
    { id: 'a', name: 'ゆるふわ立ち絵セット', shop: 'ねこ工房', url: 'https://booth.pm/ja/items/1234567' },
    { id: 'b', name: '夜のBGM集', shop: 'おとや', url: '' },
  ], templateId: 'byshop' }
  const text = serializeBackup(state, new Date('2026-10-11T00:05:00Z'))
  expect(JSON.parse(text)).toEqual({ app: 'sozai-credit', format: 1, exportedAt: '2026-10-11T00:05:00.000Z', state })
  let n = 0
  expect(parseBackup(text, () => `n${++n}`)).toEqual({ ok: true, value: { ...state, materials: state.materials.map((m, i) => ({ ...m, id: `n${i + 1}` })) } })
  expect(state.materials.map(m => m.id)).toEqual(['a', 'b'])
})
test('backup rejects bad files', () => {
  expect(parseBackup('{', () => 'x')).toEqual({ ok: false, error: 'invalid-json' })
  for (const text of ['null', '[]', '{"app":"other","format":1,"state":{"version":1,"materials":[],"templateId":"standard"}}', '{"app":"sozai-credit","format":2,"state":{}}', '{"app":"sozai-credit","format":1,"state":{"version":1}}']) {
    expect(parseBackup(text, () => 'x')).toEqual({ ok: false, error: 'not-backup' })
  }
})
test('backupFileName pads local time', () => { expect(backupFileName(new Date(2026, 9, 1, 9, 5))).toBe('sozai-credit-20261001-0905.json') })

test('backup rejects partially malformed materials', () => {
  const text = JSON.stringify({ app: 'sozai-credit', format: 1, state: { version: 1, materials: [{ id: 'a', name: 'A', shop: 'S', url: '' }, { id: 1, name: 'B', shop: 'S', url: '' }], templateId: 'standard' } })
  let calls = 0
  expect(parseBackup(text, () => { calls++; return 'new' })).toEqual({ ok: false, error: 'not-backup' })
  expect(calls).toBe(0)
})
test('backup rejects entirely malformed materials', () => {
  for (const material of [{ id: 1, name: 'A', shop: 'S', url: '' }, { id: 'a', name: null, shop: 'S', url: '' }, { id: 'a', name: 'A', shop: 1, url: '' }, { id: 'a', name: 'A', shop: 'S', url: false }, null]) {
    const text = JSON.stringify({ app: 'sozai-credit', format: 1, state: { version: 1, materials: [material], templateId: 'standard' } })
    expect(parseBackup(text, () => 'new')).toEqual({ ok: false, error: 'not-backup' })
  }
})
