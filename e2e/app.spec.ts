import { mkdirSync, readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const A = { name: 'ゆるふわ立ち絵セット', shop: 'ねこ工房', url: 'https://booth.pm/ja/items/1234567' }
const B = { name: '夜のBGM集', shop: 'おとや', url: '' }
const standard = '【使用素材】\n・ゆるふわ立ち絵セット / ねこ工房 様\nhttps://booth.pm/ja/items/1234567\n・夜のBGM集 / おとや 様'
const oneline = '【使用素材】\n・ゆるふわ立ち絵セット(ねこ工房 様) https://booth.pm/ja/items/1234567\n・夜のBGM集(おとや 様)'
const byshop = '【使用素材】\n■ねこ工房 様\n・ゆるふわ立ち絵セット\nhttps://booth.pm/ja/items/1234567\n■おとや 様\n・夜のBGM集'
const backup = JSON.stringify({ app: 'sozai-credit', format: 1, exportedAt: '2026-10-11T00:05:00.000Z', state: { version: 1, materials: [{ id: 'a', ...A }, { id: 'b', ...B }], templateId: 'oneline' } })

async function add(page: Page, material: typeof A): Promise<void> {
  await page.getByTestId('name-input').fill(material.name)
  await page.getByTestId('shop-input').fill(material.shop)
  await page.getByTestId('url-input').fill(material.url)
  await page.getByTestId('submit-button').click()
}
async function addBoth(page: Page): Promise<void> { await add(page, A); await add(page, B) }
async function importText(page: Page, text = backup): Promise<void> {
  await page.getByTestId('import-input').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(text) })
}
async function stubClipboard(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { __copied?: string }).__copied = text } } })
  })
}
async function assertCopy(page: Page): Promise<void> {
  await page.getByTestId('copy-button').click()
  await expect(page.getByTestId('copy-status')).toHaveText('コピーしました')
  expect(await page.evaluate(() => (window as unknown as { __copied?: string }).__copied)).toBe(await page.getByTestId('output').inputValue())
}

test('add and render', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await addBoth(page)
  await expect(page.getByTestId('item-row')).toHaveCount(2)
  await expect(page.getByTestId('output')).toHaveValue(standard)
  await expect(page.getByTestId('item-count')).toHaveText('2 件')
  for (const field of ['name-input', 'shop-input', 'url-input']) await expect(page.getByTestId(field)).toHaveValue('')
  mkdirSync('test-results/evidence', { recursive: true })
  await page.screenshot({ path: 'test-results/evidence/desktop-light.png', fullPage: true })
})
test('validation errors', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('submit-button').click()
  await expect(page.getByTestId('form-error')).toHaveText('素材名を入力してください')
  await add(page, { name: 'A', shop: 'B', url: 'abc' })
  await expect(page.getByTestId('form-error')).toHaveText('URL は http:// か https:// で始めてください')
  await expect(page.getByTestId('item-row')).toHaveCount(0)
})
test('url normalized', async ({ page }) => {
  await page.goto('/')
  await add(page, { name: 'A', shop: 'B', url: 'https://shop.booth.pm/items/1234567/?utm_source=x' })
  await expect(page.getByTestId('item-url')).toHaveText('https://shop.booth.pm/items/1234567')
  expect(await page.getByTestId('output').inputValue()).not.toContain('utm_source')
})
test('edit delete move', async ({ page }) => {
  await page.goto('/')
  await addBoth(page)
  await page.getByTestId('item-row').nth(1).getByTestId('move-up').click()
  await expect(page.getByTestId('item-name')).toHaveText([B.name, A.name])
  expect((await page.getByTestId('output').inputValue()).indexOf(B.name)).toBeLessThan((await page.getByTestId('output').inputValue()).indexOf(A.name))
  await page.getByTestId('item-row').nth(0).getByTestId('move-down').click()
  await expect(page.getByTestId('output')).toHaveValue(standard)
  await page.getByTestId('item-row').nth(0).getByTestId('edit').click()
  await page.getByTestId('name-input').fill('A2')
  await page.getByTestId('submit-button').click()
  expect((await page.getByTestId('output').inputValue()).split('\n')[1]).toBe('・A2 / ねこ工房 様')
  await expect(page.getByTestId('submit-button')).toHaveText('追加')
  await page.getByTestId('item-row').nth(1).getByTestId('delete').click()
  await expect(page.getByTestId('output')).toHaveValue('【使用素材】\n・A2 / ねこ工房 様\nhttps://booth.pm/ja/items/1234567')
})
test('template switch', async ({ page }) => {
  await page.goto('/')
  await addBoth(page)
  await page.getByTestId('template-oneline').check()
  await expect(page.getByTestId('output')).toHaveValue(oneline)
  await page.getByTestId('template-byshop').check()
  await expect(page.getByTestId('output')).toHaveValue(byshop)
})
test('char count warning', async ({ page }) => {
  await page.goto('/')
  await add(page, { name: 'あ'.repeat(5000), shop: 'S', url: '' })
  await expect(page.getByTestId('char-count')).toHaveAttribute('data-over', 'true')
})
test('escapes user input', async ({ page }) => {
  await page.goto('/')
  await add(page, { name: '<b>x</b>', shop: 'S', url: '' })
  await expect(page.getByTestId('item-name')).toHaveText('<b>x</b>')
  await expect(page.getByTestId('item-row').locator('b')).toHaveCount(0)
  await expect(page.getByTestId('angle-warning')).toBeVisible()
})
test('copy', async ({ page }) => {
  await stubClipboard(page)
  await page.goto('/')
  await add(page, A)
  await assertCopy(page)
})
test('persists after reload', async ({ page }) => {
  await page.goto('/')
  await add(page, A)
  await page.getByTestId('template-byshop').check()
  await page.reload()
  await expect(page.getByTestId('item-row')).toHaveCount(1)
  await expect(page.getByTestId('template-byshop')).toBeChecked()
})
test('storage unavailable', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('denied') } }) })
  await stubClipboard(page)
  await page.goto('/')
  await expect(page.getByTestId('storage-warning')).toBeVisible()
  await add(page, A)
  expect(await page.getByTestId('output').inputValue()).toContain(A.name)
  await assertCopy(page)
})
test('export downloads backup', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('export-button')).toBeDisabled()
  await addBoth(page)
  await page.getByTestId('template-byshop').check()
  const downloadEvent = page.waitForEvent('download')
  await page.getByTestId('export-button').click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toMatch(/^sozai-credit-\d{8}-\d{4}\.json$/)
  const path = await download.path()
  expect(path).not.toBeNull()
  const data = JSON.parse(readFileSync(path!, 'utf8')) as { app: string; state: { materials: Array<{ name: string }>; templateId: string } }
  expect(data.app).toBe('sozai-credit')
  expect(data.state.materials.map(m => m.name)).toEqual([A.name, B.name])
  expect(data.state.templateId).toBe('byshop')
  await expect(page.getByTestId('backup-status')).toHaveText('書き出しました')
})
test('import replaces after confirm', async ({ page }) => {
  await page.goto('/')
  await add(page, { name: 'X', shop: 'S', url: '' })
  page.once('dialog', dialog => dialog.accept())
  await importText(page)
  await expect(page.getByTestId('item-name')).toHaveText([A.name, B.name])
  await expect(page.getByTestId('template-oneline')).toBeChecked()
  await expect(page.getByTestId('output')).toHaveValue(oneline)
  await expect(page.getByTestId('backup-status')).toHaveText('読み込みました(2 件)')
  await page.reload()
  await expect(page.getByTestId('item-row')).toHaveCount(2)
})
test('import cancel keeps state', async ({ page }) => {
  await page.goto('/')
  await add(page, { name: 'X', shop: 'S', url: '' })
  const dialogEvent = page.waitForEvent('dialog')
  const importing = importText(page)
  const dialog = await dialogEvent
  expect(dialog.message()).toContain('今の登録(1 件)')
  expect(dialog.message()).toContain('(2 件)')
  await dialog.dismiss()
  await importing
  await expect(page.getByTestId('item-name')).toHaveText(['X'])
  await expect(page.getByTestId('backup-status')).toHaveText('')
})
test('import into empty list without confirm', async ({ page }) => {
  await page.goto('/')
  let dialogs = 0
  page.on('dialog', async dialog => { dialogs++; await dialog.dismiss() })
  await importText(page)
  await expect(page.getByTestId('item-row')).toHaveCount(2)
  await expect(page.getByTestId('backup-status')).toHaveText('読み込みました(2 件)')
  expect(dialogs).toBe(0)
})
test('import rejects bad file', async ({ page }) => {
  await page.goto('/')
  await add(page, { name: 'X', shop: 'S', url: '' })
  let dialogs = 0
  page.on('dialog', async dialog => { dialogs++; await dialog.dismiss() })
  await importText(page, '{"hello":1}')
  await expect(page.getByTestId('backup-status')).toHaveText('このファイルは素材クレジットメーカーの書き出しファイルではありません。')
  await expect(page.getByTestId('item-name')).toHaveText(['X'])
  await importText(page, 'not json')
  await expect(page.getByTestId('backup-status')).toHaveText('読み込めませんでした。ファイルが壊れているか、JSON ではありません。')
  await expect(page.getByTestId('item-name')).toHaveText(['X'])
  expect(dialogs).toBe(0)
})
test('no item limit', async ({ page }) => {
  await page.goto('/')
  for (let i = 1; i <= 20; i++) await add(page, { name: `M${i}`, shop: 'S', url: '' })
  await expect(page.getByTestId('item-row')).toHaveCount(20)
  await expect(page.getByTestId('item-count')).toHaveText('20 件')
  await expect(page.getByTestId('submit-button')).toBeEnabled()
})
test('layout: no horizontal scroll at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await add(page, A)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await add(page, B)
  mkdirSync('test-results/evidence', { recursive: true })
  await page.screenshot({ path: 'test-results/evidence/mobile-dark.png', fullPage: true })
})
test('layout: two columns at 1024px', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto('/')
  const input = await page.getByTestId('col-input').boundingBox()
  const output = await page.getByTestId('col-output').boundingBox()
  expect(output!.x).toBeGreaterThan(input!.x)
  await page.setViewportSize({ width: 700, height: 800 })
  const narrowInput = await page.getByTestId('col-input').boundingBox()
  const narrowOutput = await page.getByTestId('col-output').boundingBox()
  expect(narrowOutput!.y).toBeGreaterThan(narrowInput!.y)
})

test('import rejects malformed material types without replacing', async ({ page }) => {
  await page.goto('/')
  await add(page, { name: 'X', shop: 'S', url: '' })
  let dialogs = 0
  page.on('dialog', async dialog => { dialogs++; await dialog.dismiss() })
  for (const materials of [[{ id: 1, ...A }], [{ id: 'a', ...A }, { id: 'b', name: 1, shop: 'S', url: '' }]]) {
    await importText(page, JSON.stringify({ app: 'sozai-credit', format: 1, state: { version: 1, materials, templateId: 'standard' } }))
    await expect(page.getByTestId('backup-status')).toHaveText('このファイルは素材クレジットメーカーの書き出しファイルではありません。')
    await expect(page.getByTestId('item-name')).toHaveText(['X'])
    expect(dialogs).toBe(0)
  }
})
test('late save denied warns and retains output copy download', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
      getItem: () => null,
      setItem: (key: string) => { if (key === 'sozai-credit:v1') throw new Error('quota') },
      removeItem: () => {},
    } })
  })
  await stubClipboard(page)
  await page.goto('/')
  await expect(page.getByTestId('storage-warning')).toBeHidden()
  await add(page, A)
  await expect(page.getByTestId('storage-warning')).toBeVisible()
  expect(await page.getByTestId('output').inputValue()).toContain(A.name)
  await assertCopy(page)
  const downloadEvent = page.waitForEvent('download')
  await page.getByTestId('export-button').click()
  const download = await downloadEvent
  const path = await download.path()
  const data = JSON.parse(readFileSync(path!, 'utf8')) as { state: { materials: Array<{ name: string }> } }
  expect(data.state.materials.map(material => material.name)).toEqual([A.name])
  await expect(page.getByTestId('backup-status')).toHaveText('書き出しました')
})
test('load denied warns after successful probe', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
      getItem: () => { throw new Error('denied') },
      setItem: () => {},
      removeItem: () => {},
    } })
  })
  await page.goto('/')
  await expect(page.getByTestId('storage-warning')).toBeVisible()
  await expect(page.getByTestId('item-row')).toHaveCount(0)
})
