import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/sample.jpg'))

test('upload one image, see it in gallery', async ({ page }) => {
  const stamp = Date.now()
  const filename = `pw-${stamp}.jpg`
  // Backend derives title from the filename stem: replace -/_ with space, Title Case.
  // See backend/main.py: original_name.replace("_", " ").replace("-", " ").title()
  const expectedTitle = `Pw ${stamp}`

  await page.goto('/')

  const uploadResponse = page.waitForResponse(
    (r) => r.url().includes('/api/images/upload') && r.status() === 200,
  )

  await page.locator('input[type="file"]').setInputFiles({
    name: filename,
    mimeType: 'image/jpeg',
    buffer: fixture,
  })

  await expect(
    page.getByRole('region', { name: 'Upload status' }),
  ).toBeVisible()

  await uploadResponse

  // Reload to assert the upload persisted. The live gallery does refresh on
  // upload in real browsers via TanStack Query invalidation, but in Playwright
  // headless the focus-driven refetch can lag — testing through a reload
  // exercises the persistence contract directly and stays fast and stable.
  await page.reload()

  await expect(page.getByAltText(expectedTitle)).toBeVisible({ timeout: 10_000 })
})
