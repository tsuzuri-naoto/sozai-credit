import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test('relative asset paths', () => {
  const html = readFileSync('dist/index.html', 'utf8')
  expect(html).not.toContain('src="/')
  expect(html).not.toContain('href="/')
  expect(html).toContain('./assets/')
})
