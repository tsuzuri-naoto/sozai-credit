import { expect, test } from 'vitest'
import { countChars, renderCredits } from './templates'
import type { Material, TemplateId } from './model'

const materials: Material[] = [
  { id: 'a', name: 'ゆるふわ立ち絵セット', shop: 'ねこ工房', url: 'https://booth.pm/ja/items/1234567' },
  { id: 'b', name: '夜のBGM集', shop: 'おとや', url: '' },
]
test('renders standard / oneline / byshop', () => {
  expect(renderCredits(materials, 'standard')).toBe('【使用素材】\n・ゆるふわ立ち絵セット / ねこ工房 様\nhttps://booth.pm/ja/items/1234567\n・夜のBGM集 / おとや 様')
  expect(renderCredits(materials, 'oneline')).toBe('【使用素材】\n・ゆるふわ立ち絵セット(ねこ工房 様) https://booth.pm/ja/items/1234567\n・夜のBGM集(おとや 様)')
  expect(renderCredits(materials, 'byshop')).toBe('【使用素材】\n■ねこ工房 様\n・ゆるふわ立ち絵セット\nhttps://booth.pm/ja/items/1234567\n■おとや 様\n・夜のBGM集')
})
test('byshop groups by first appearance', () => {
  expect(renderCredits([{ id: 'x', name: 'x', shop: 'S1', url: '' }, { id: 'y', name: 'y', shop: 'S2', url: '' }, { id: 'z', name: 'z', shop: 'S1', url: '' }], 'byshop')).toBe('【使用素材】\n■S1 様\n・x\n・z\n■S2 様\n・y')
})
test('renders empty', () => {
  for (const id of ['standard', 'oneline', 'byshop'] as TemplateId[]) expect(renderCredits([], id)).toBe('')
})
test('countChars counts code points', () => { expect(countChars('あ😀a')).toBe(3) })
