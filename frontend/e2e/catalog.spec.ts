import { test, expect } from '@playwright/test'

const apiUrl = process.env.E2E_API_BASE_URL || 'http://localhost:8080'
const runId = Date.now().toString(36)

test('health, seeded catalog, and purchase order navigation render', async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/products')
  await expect(page).toHaveTitle('Products · StockPilot')
  await expect(page.getByRole('link', { name: 'StockPilot home' })).toBeVisible()
  expect((await request.get(`${apiUrl}/api/health`)).status()).toBe(200)
  await expect(page.getByText('API Status:', { exact: false })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('products-desktop.png'), fullPage: true })
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await page.getByRole('link', { name: 'Purchase Orders', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Purchase Orders', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('product UI creates, validates duplicate, edits, searches, filters, and deactivates', async ({
  page,
  request,
}) => {
  const sku = `UI-${runId}`
  const name = `Safety gloves ${runId}`
  await page.goto('/products')
  await page.getByRole('link', { name: 'Add product', exact: true }).click()
  await page.getByLabel('SKU', { exact: false }).fill(sku)
  await page.getByLabel('Product name').fill(name)
  await page
    .getByLabel('Description', { exact: true })
    .fill('Created through the browser verification flow')
  await page.getByLabel('Unit cost (USD)').fill('12.50')
  await page.getByLabel('Opening stock').fill('12')
  await page.getByLabel('Reorder point').fill('20')
  await page.getByRole('button', { name: 'Create product', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Product created.' })).toBeVisible()
  let row = page.getByRole('row').filter({ hasText: sku })
  await expect(row).toContainText('Low stock')
  await expect(row).toContainText('$12.50')

  await page.getByRole('link', { name: 'Add product', exact: true }).click()
  await page.getByLabel('SKU', { exact: false }).fill(sku)
  await page.getByLabel('Product name').fill('Duplicate attempt')
  await page.getByLabel('Unit cost (USD)').fill('3.25')
  await page.getByRole('button', { name: 'Create product', exact: true }).click()
  await expect(page.locator('#sku-error')).toContainText('already in use')
  await page.getByRole('link', { name: 'Back to products' }).click()

  await page.getByRole('link', { name: `Edit ${name}`, exact: true }).click()
  await page.getByLabel('Product name').fill(`${name} updated`)
  await expect(page.getByLabel('Quantity on hand')).toHaveAttribute('readonly', '')
  await expect(page.getByLabel('Quantity on hand')).toHaveValue('12')
  await page.getByLabel('Reorder point').fill('10')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Product updated.' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Search records' }).fill(sku)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  row = page.getByRole('row').filter({ hasText: sku })
  await expect(row).toContainText('In stock')
  await expect(page.getByRole('row')).toHaveCount(2)
  await row.getByRole('button', { name: `Deactivate ${name} updated` }).click()
  await page.getByRole('button', { name: 'Deactivate record', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Product deactivated.' })).toBeVisible()
  await expect(row).toContainText('Inactive')
  await page.getByLabel('Active filter').selectOption('true')
  await expect(page.getByText('No products found')).toBeVisible()
  await page.getByLabel('Active filter').selectOption('false')
  await expect(page.getByRole('row').filter({ hasText: sku })).toContainText('Inactive')
  await page.reload()
  await expect(page.getByRole('row').filter({ hasText: sku })).toContainText(`${name} updated`)
  const persisted = await request.get(`${apiUrl}/api/products?search=${sku}`)
  const product = (await persisted.json()).content[0] as {
    active: boolean
    unitCost: string
    quantityOnHand: number
  }
  expect(product).toMatchObject({ active: false, unitCost: '12.50', quantityOnHand: 12 })
})

test('vendor UI creates, edits, searches by email, and deactivates', async ({ page, request }) => {
  const name = `Caribbean UI Supply ${runId}`
  const email = `ui-${runId}@example.com`
  await page.goto('/vendors')
  await page.getByRole('link', { name: 'Add vendor', exact: true }).click()
  await page.getByLabel('Vendor name').fill(name)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Phone number').fill('787-555-0101')
  await page.getByRole('button', { name: 'Create vendor', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Vendor created.' })).toBeVisible()
  await page.getByRole('link', { name: `Edit ${name}`, exact: true }).click()
  await page.getByLabel('Vendor name').fill(`${name} updated`)
  await page.getByLabel('Phone number').fill('787-555-0102')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Vendor updated.' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Search records' }).fill(email)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const row = page.getByRole('row').filter({ hasText: email })
  await expect(row).toContainText('787-555-0102')
  await expect(page.getByRole('row')).toHaveCount(2)
  await row.getByRole('button', { name: `Deactivate ${name} updated` }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(row).toContainText('Active')
  await row.getByRole('button', { name: `Deactivate ${name} updated` }).click()
  await page.getByRole('button', { name: 'Deactivate record', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Vendor deactivated.' })).toBeVisible()
  await expect(row).toContainText('Inactive')
  await page.getByLabel('Active filter').selectOption('false')
  await expect(row).toContainText('Inactive')
  await page.reload()
  await expect(row).toContainText(`${name} updated`)
  const persisted = await request.get(`${apiUrl}/api/vendors?search=${email}`)
  const vendor = (await persisted.json()).content[0] as { active: boolean; phone: string }
  expect(vendor).toMatchObject({ active: false, phone: '787-555-0102' })
})

test('catalog pagination uses the server and clear filters resets search and active state', async ({
  page,
  request,
}) => {
  const prefix = `PAGE-${runId}`
  const ids: number[] = []
  try {
    for (let i = 0; i < 11; i++) {
      const response = await request.post(`${apiUrl}/api/products`, {
        data: { sku: `${prefix}-${i}`, name: `Pagination fixture ${i}`, unitCost: '1.25' },
      })
      expect(response.status()).toBe(201)
      ids.push((await response.json()).id as number)
    }
    await page.goto(`/products?search=${prefix}&active=true`)
    await expect(page.getByRole('row')).toHaveCount(11)
    await expect(page.getByText('Page 1 of 2')).toBeVisible()
    const nextRequest = page.waitForRequest(
      (request) => request.url().includes('/api/products?') && request.url().includes('page=1'),
    )
    await page.getByRole('button', { name: 'Next page' }).click()
    await nextRequest
    await expect(page.getByRole('row')).toHaveCount(2)
    await expect(page.getByText('Page 2 of 2')).toBeVisible()
    await page.getByRole('button', { name: 'Previous page' }).click()
    await expect(page.getByRole('row')).toHaveCount(11)
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(page.getByRole('textbox', { name: 'Search records' })).toHaveValue('')
    await expect(page.getByLabel('Active filter')).toHaveValue('')
    await expect(page).toHaveURL('/products')
  } finally {
    for (const id of ids) await request.patch(`${apiUrl}/api/products/${id}/deactivate`)
  }
})

test('loading and API errors are readable and can be retried', async ({ page }) => {
  let release: () => void = () => {}
  const hold = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/vendors?*', async (route) => {
    await hold
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Temporary test outage' }),
    })
  })
  await page.goto('/vendors')
  await expect(page.getByText('Loading records…')).toBeVisible()
  release()
  await expect(page.getByRole('alert')).toContainText('Temporary test outage')
  await page.unroute('**/api/vendors?*')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await page.goto('/products?search=no-record-matches-this-query')
  await expect(page.getByText('No products found')).toBeVisible()
})

test('mobile navigation and forms fit the viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/vendors/new')
  await expect(page.getByLabel('Vendor name')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('vendor-mobile.png'), fullPage: true })
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width)
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Products', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Add product', exact: true }).click()
  await expect(page.getByLabel('Product name')).toBeVisible()
})
