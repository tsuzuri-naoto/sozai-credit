import { expect, test, type Page } from '@playwright/test'

type Entry = { category?: string; name: string; shop?: string; url?: string; requirement?: string; fixedText?: string }

async function add(page: Page, entry: Entry): Promise<void> {
  await page.getByTestId('category-input').fill(entry.category ?? '')
  await page.getByTestId('name-input').fill(entry.name)
  await page.getByTestId('shop-input').fill(entry.shop ?? '')
  await page.getByTestId('url-input').fill(entry.url ?? '')
  await page.getByTestId('requirement-input').selectOption(entry.requirement ?? 'unknown')
  if (entry.fixedText !== undefined) {
    if (!(await page.getByTestId('fixed-details').evaluate(node => (node as HTMLDetailsElement).open))) await page.getByText('配布元が書き方を決めているとき').click()
    await page.getByTestId('fixed-input').fill(entry.fixedText)
  }
  await page.getByTestId('submit-button').click()
}

test('honorific is off by default and can be turned on', async ({ page }) => {
  await page.goto('/')
  await add(page, { name: 'A', shop: 'S' })
  await expect(page.getByTestId('honorific')).not.toBeChecked()
  await expect(page.getByTestId('output')).toHaveValue('【使用素材】\n・A / S')
  await page.getByTestId('honorific').check()
  await expect(page.getByTestId('output')).toHaveValue('【使用素材】\n・A / S 様')
  await page.reload()
  await expect(page.getByTestId('honorific')).toBeChecked()
})

test('category, X handle, fixed text and bycategory template', async ({ page }) => {
  await page.goto('/')
  await add(page, { category: 'BGM', name: '夜の街', shop: 'おとや', url: '@otoya', requirement: 'required' })
  await add(page, { name: 'オーディオライブラリの曲', fixedText: 'Music: Example Track\nhttps://example.com/track' })
  await add(page, { category: '背景', name: '教室', shop: 'えのぐ' })
  await expect(page.getByTestId('item-category')).toHaveText(['BGM', '背景'])
  await expect(page.getByTestId('item-requirement').first()).toHaveText('表記: 必須')
  await expect(page.getByTestId('item-fixed')).toHaveText('Music: Example Track\nhttps://example.com/track')
  await expect(page.getByTestId('output')).toHaveValue('【使用素材】\n・BGM: 夜の街 / おとや\n@otoya\nMusic: Example Track\nhttps://example.com/track\n・背景: 教室 / えのぐ')
  await page.getByTestId('template-bycategory').check()
  await expect(page.getByTestId('output')).toHaveValue('【使用素材】\n■BGM\n・夜の街 / おとや\n@otoya\n■背景\n・教室 / えのぐ\n■その他\nMusic: Example Track\nhttps://example.com/track')
})

test('edit restores every field including fixed text', async ({ page }) => {
  await page.goto('/')
  await add(page, { category: 'BGM', name: 'A', shop: 'S', url: '@s', requirement: 'optional', fixedText: 'BGM: S' })
  await page.getByTestId('edit').click()
  await expect(page.getByTestId('category-input')).toHaveValue('BGM')
  await expect(page.getByTestId('url-input')).toHaveValue('@s')
  await expect(page.getByTestId('requirement-input')).toHaveValue('optional')
  await expect(page.getByTestId('fixed-input')).toBeVisible()
  await expect(page.getByTestId('fixed-input')).toHaveValue('BGM: S')
})

test('choose materials for this stream', async ({ page }) => {
  await page.goto('/')
  await add(page, { name: 'A' })
  await add(page, { name: 'B' })
  await expect(page.getByTestId('use-summary')).toHaveText('今回使う素材 2 件 / 登録 2 件')
  await page.getByTestId('item-inuse').first().uncheck()
  await expect(page.getByTestId('output')).toHaveValue('【使用素材】\n・B')
  await expect(page.getByTestId('use-summary')).toHaveText('今回使う素材 1 件 / 登録 2 件')
  await page.getByTestId('use-none').click()
  await expect(page.getByTestId('output')).toHaveValue('')
  await page.getByTestId('use-all').click()
  await expect(page.getByTestId('output')).toHaveValue('【使用素材】\n・A\n・B')
  await page.getByTestId('item-inuse').nth(1).uncheck()
  await page.reload()
  await expect(page.getByTestId('item-inuse').nth(1)).not.toBeChecked()
})

test('unknown requirement hint counts materials in use', async ({ page }) => {
  await page.goto('/')
  await add(page, { name: 'A' })
  await add(page, { name: 'B', requirement: 'none' })
  await expect(page.getByTestId('unknown-hint')).toContainText('未確認の素材が 1 件')
  await page.getByTestId('item-inuse').first().uncheck()
  await expect(page.getByTestId('unknown-hint')).toBeHidden()
})
