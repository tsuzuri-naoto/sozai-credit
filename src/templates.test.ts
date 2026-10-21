import { expect, test } from 'vitest'
import { countChars, renderCredits, TEMPLATES } from './templates'
import type { Material } from './model'

const m = (id: string, overrides: Partial<Material>): Material => ({ id, category: '', name: id, shop: '', url: '', fixedText: '', requirement: 'unknown', inUse: true, ...overrides })
const materials: Material[] = [
  m('a', { name: 'ゆるふわ立ち絵セット', shop: 'ねこ工房', url: 'https://booth.pm/ja/items/1234567' }),
  m('b', { name: '夜のBGM集', shop: 'おとや' }),
]
const sama = { honorific: true }
const plain = { honorific: false }

test('renders standard / oneline / byshop with honorific (same as version 1)', () => {
  expect(renderCredits(materials, 'standard', sama)).toBe('【使用素材】\n・ゆるふわ立ち絵セット / ねこ工房 様\nhttps://booth.pm/ja/items/1234567\n・夜のBGM集 / おとや 様')
  expect(renderCredits(materials, 'oneline', sama)).toBe('【使用素材】\n・ゆるふわ立ち絵セット(ねこ工房 様) https://booth.pm/ja/items/1234567\n・夜のBGM集(おとや 様)')
  expect(renderCredits(materials, 'byshop', sama)).toBe('【使用素材】\n■ねこ工房 様\n・ゆるふわ立ち絵セット\nhttps://booth.pm/ja/items/1234567\n■おとや 様\n・夜のBGM集')
})
test('renders without honorific', () => {
  expect(renderCredits(materials, 'standard', plain)).toBe('【使用素材】\n・ゆるふわ立ち絵セット / ねこ工房\nhttps://booth.pm/ja/items/1234567\n・夜のBGM集 / おとや')
  expect(renderCredits(materials, 'oneline', plain)).toBe('【使用素材】\n・ゆるふわ立ち絵セット(ねこ工房) https://booth.pm/ja/items/1234567\n・夜のBGM集(おとや)')
})
test('category label, optional shop, X handle', () => {
  const list = [m('a', { category: 'BGM', name: '夜の街', shop: 'おとや', url: '@otoya' }), m('b', { name: 'フレーム' })]
  expect(renderCredits(list, 'standard', plain)).toBe('【使用素材】\n・BGM: 夜の街 / おとや\n@otoya\n・フレーム')
  expect(renderCredits(list, 'oneline', plain)).toBe('【使用素材】\n・BGM: 夜の街(おとや) @otoya\n・フレーム')
})
test('bycategory groups by category, uncategorized last as その他', () => {
  const list = [m('x', { name: 'x', shop: 'S1' }), m('y', { category: 'BGM', name: 'y', shop: 'S2' }), m('z', { category: 'BGM', name: 'z' })]
  expect(renderCredits(list, 'bycategory', sama)).toBe('【使用素材】\n■BGM\n・y / S2 様\n・z\n■その他\n・x / S1 様')
})
test('byshop groups by first appearance, no-shop last as その他', () => {
  const list = [m('x', { shop: 'S1' }), m('n', {}), m('y', { shop: 'S2' }), m('z', { shop: 'S1', category: '背景' })]
  expect(renderCredits(list, 'byshop', plain)).toBe('【使用素材】\n■S1\n・x\n・背景: z\n■S2\n・y\n■その他\n・n')
})
test('fixed text replaces the generated entry in every template', () => {
  const list = [m('a', { name: 'A', shop: 'S', fixedText: 'Music provided by YouTube Audio Library\nhttps://example.com' }), m('b', { name: 'B', shop: 'S' })]
  expect(renderCredits(list, 'standard', plain)).toBe('【使用素材】\nMusic provided by YouTube Audio Library\nhttps://example.com\n・B / S')
  expect(renderCredits(list, 'byshop', plain)).toBe('【使用素材】\n■S\nMusic provided by YouTube Audio Library\nhttps://example.com\n・B')
})
test('only materials in use are rendered', () => {
  expect(renderCredits([m('a', { inUse: false }), m('b', {})], 'standard', plain)).toBe('【使用素材】\n・b')
  expect(renderCredits([m('a', { inUse: false })], 'standard', plain)).toBe('')
})
test('renders empty', () => {
  for (const { id } of TEMPLATES) expect(renderCredits([], id, plain)).toBe('')
})
test('countChars counts code points', () => { expect(countChars('あ😀a')).toBe(3) })
