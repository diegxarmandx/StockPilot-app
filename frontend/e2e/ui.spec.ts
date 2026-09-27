import { test, expect } from '@playwright/test'
import type { Product, Vendor, PurchaseOrder } from '../src/types/api'

const api = process.env.E2E_API_BASE_URL || 'http://localhost:8080'

test('operational pages fit six viewport widths and have no development copy', async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(120000)
  const run = Date.now()
  const productResponse = await request.post(`${api}/api/products`, {
    data: {
      sku: `VIS-${run}`,
      name: 'Industrial safety gloves — reinforced grip',
      description: 'Durable work gloves for daily handling and warehouse operations.',
      unitCost: '12.50',
      quantityOnHand: 20,
      reorderPoint: 25,
    },
  })
  expect(productResponse.status()).toBe(201)
  const product = (await productResponse.json()) as Product
  const vendorResponse = await request.post(`${api}/api/vendors`, {
    data: {
      name: 'Caribbean Industrial Supply and Distribution',
      email: 'orders@example.com',
      phone: '+1 787 555 0180',
    },
  })
  expect(vendorResponse.status()).toBe(201)
  const vendor = (await vendorResponse.json()) as Vendor
  const orders: PurchaseOrder[] = []
  for (let i = 0; i < 3; i++) {
    const response = await request.post(`${api}/api/purchase-orders`, {
      data: { vendorId: vendor.id, items: [{ productId: product.id, quantity: 10 }] },
    })
    expect(response.status()).toBe(201)
    const order = (await response.json()) as PurchaseOrder
    if (i > 0)
      expect((await request.post(`${api}/api/purchase-orders/${order.id}/order`)).status()).toBe(
        200,
      )
    if (i === 2)
      expect((await request.post(`${api}/api/purchase-orders/${order.id}/receive`)).status()).toBe(
        200,
      )
    orders.push(order)
  }
  const routes = [
    ['dashboard', '/'],
    ['products', `/products?search=${product.sku}`],
    ['new-product', '/products/new'],
    ['edit-product', `/products/${product.id}/edit`],
    ['vendors', '/vendors?search=Caribbean%20Industrial'],
    ['new-vendor', '/vendors/new'],
    ['purchase-orders', '/purchase-orders'],
    ['new-purchase-order', '/purchase-orders/new'],
    ['draft', `/purchase-orders/${orders[0].id}`],
    ['ordered', `/purchase-orders/${orders[1].id}`],
    ['received', `/purchase-orders/${orders[2].id}`],
    ['inventory', `/inventory?referenceId=${orders[2].poNumber}`],
  ]
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const [name, path] of routes) {
      await page.goto(path)
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.getByRole('status', { name: 'Loading records' })).toHaveCount(0)
      await expect(page.locator('main')).not.toContainText(
        /API Status|Phase \d|Coming soon|backend|development|ERP Demo|OpsCore|PURCHASE_RECEIPT/,
      )
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow, `${name} overflows at ${width}px`).toBe(false)
      if (width <= 768)
        await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()
      if (width === 1440 || width === 390) {
        await page.screenshot({
          path: testInfo.outputPath(`${name}-${width}.png`),
          fullPage: width === 1440,
        })
      }
    }
  }
  expect(errors).toEqual([])
})

test('mobile drawer and desktop skip link are keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/products')
  const trigger = page.getByRole('button', { name: 'Open navigation' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const drawer = page.getByRole('dialog', { name: 'Navigation' })
  await expect(drawer).toBeVisible()
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Tab')
    expect(await drawer.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(drawer).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await drawer.getByRole('link', { name: 'Vendors', exact: true }).click()
  await expect(page.locator('h1')).toHaveText('Vendors')
  await expect(drawer).not.toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/products')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
})

test('empty, loading, error and long-content states stay readable', async ({ page }, testInfo) => {
  let release: () => void = () => {}
  const hold = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/products?*', async (route) => {
    await hold
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Please try again shortly.' }),
    })
  })
  await page.goto('/products')
  await expect(page.getByRole('status', { name: 'Loading records' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('loading.png') })
  release()
  await expect(page.getByRole('alert')).toContainText('Unable to load products.')
  await page.screenshot({ path: testInfo.outputPath('error.png') })
  await page.unroute('**/api/products?*')
  await page.route('**/api/products?*', (route) =>
    route.fulfill({
      json: {
        content: [],
        totalElements: 0,
        page: 0,
        size: 10,
        totalPages: 0,
        first: true,
        last: true,
      },
    }),
  )
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText('No products yet')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('empty.png') })
  await page.unroute('**/api/products?*')
  await page.route('**/api/products?*', (route) =>
    route.fulfill({
      json: {
        content: [
          {
            id: 1,
            sku: 'SKU-'.padEnd(64, 'W'),
            name: 'Product'.padEnd(160, 'W'),
            description: 'Long specifications. '.repeat(30),
            unitCost: '9999999999.99',
            quantityOnHand: 2147483647,
            reorderPoint: 2147483647,
            active: true,
            stockStatus: 'LOW_STOCK',
          },
        ],
        totalElements: 1,
        page: 0,
        size: 10,
        totalPages: 1,
        first: true,
        last: true,
      },
    }),
  )
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/products')
    await expect(page.getByRole('table')).toBeVisible()
    expect(
      await page.locator('tbody tr').evaluate((row) => row.getBoundingClientRect().height),
    ).toBeLessThan(220)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`long-content-${width}.png`) })
  }
})
