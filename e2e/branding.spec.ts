import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test('header, empty hint and footer', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('素材クレジットメーカー | 綴 尚音')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('素材クレジットメーカー')
  await expect(page.getByRole('link', { name: 'ホーム' })).toHaveAttribute('href', 'https://tsuzuri-naoto.github.io/')
  await expect(page.getByRole('link', { name: 'ソース(GitHub)' })).toHaveAttribute('href', 'https://github.com/tsuzuri-naoto/sozai-credit')
  await expect(page.getByTestId('empty-hint')).toBeVisible()
  await page.getByTestId('name-input').fill('A')
  await page.getByTestId('shop-input').fill('B')
  await page.getByTestId('submit-button').click()
  await expect(page.getByTestId('empty-hint')).toBeHidden()
  await page.getByTestId('delete').click()
  await expect(page.getByTestId('empty-hint')).toBeVisible()
})

test('stays light on dark-mode devices', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(243, 246, 251)')
})

test('evidence screenshots', async ({ page }) => {
  mkdirSync('test-results/evidence', { recursive: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.screenshot({ path: 'test-results/evidence/desktop-empty.png', fullPage: true })
  for (const [category, name, shop, url, requirement] of [['立ち絵', 'ゆるふわ立ち絵セット', 'ねこ工房', 'https://booth.pm/ja/items/1234567?utm_source=x', 'none'], ['BGM', '夜のBGM集 vol.2', 'おとのは', '@otonoha', 'required'], ['配信画面', '配信用フレーム', 'そらいろデザイン', '', 'unknown']]) {
    await page.getByTestId('category-input').fill(category)
    await page.getByTestId('name-input').fill(name)
    await page.getByTestId('shop-input').fill(shop)
    await page.getByTestId('url-input').fill(url)
    await page.getByTestId('requirement-input').selectOption(requirement)
    await page.getByTestId('submit-button').click()
  }
  await page.getByTestId('item-inuse').first().uncheck()
  await page.screenshot({ path: 'test-results/evidence/desktop-filled.png', fullPage: true })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({ path: 'test-results/evidence/mobile-filled.png', fullPage: true })
})
