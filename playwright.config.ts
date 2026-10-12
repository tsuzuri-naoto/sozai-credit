import { defineConfig } from '@playwright/test'

const channel = process.env.SOZAI_CREDIT_BROWSER_CHANNEL
if (channel !== undefined && channel !== 'chrome' && channel !== 'msedge') {
  throw new Error('SOZAI_CREDIT_BROWSER_CHANNEL must be chrome or msedge')
}

export default defineConfig({
  testDir: 'e2e',
  projects: [{ name: 'chromium', use: { browserName: 'chromium', ...(channel ? { channel } : {}) } }],
  use: { baseURL: 'http://localhost:4173/' },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: false,
  },
})
