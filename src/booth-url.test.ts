import { expect, test } from 'vitest'
import { normalizeUrl } from './booth-url'

test('normalizes booth.pm item url', () => {
  for (const url of ['https://booth.pm/ja/items/1234567?utm_source=x', 'https://booth.pm/en/items/1234567/', 'https://booth.pm/items/1234567']) {
    expect(normalizeUrl(url)).toBe('https://booth.pm/ja/items/1234567')
  }
})
test('normalizes shop subdomain url', () => {
  for (const url of ['https://shop.booth.pm/items/1234567/', 'http://shop.booth.pm/items/1234567#top']) {
    expect(normalizeUrl(url)).toBe('https://shop.booth.pm/items/1234567')
  }
})
test('strips query on other booth pages', () => {
  expect(normalizeUrl('https://shop.booth.pm/?tab=items')).toBe('https://shop.booth.pm')
  expect(normalizeUrl('https://booth.pm/ja/browse/音楽?x=1')).toBe('https://booth.pm/ja/browse/%E9%9F%B3%E6%A5%BD')
})
test('keeps non-booth urls', () => {
  expect(normalizeUrl('  https://example.com/a?b=1  ')).toBe('https://example.com/a?b=1')
})
test('rejects non-http', () => {
  for (const url of ['booth.pm/ja/items/1', 'javascript:alert(1)', 'ftp://booth.pm/items/1']) expect(normalizeUrl(url)).toBeNull()
})
