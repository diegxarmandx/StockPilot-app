import { test, expect } from '@playwright/test'
import type { Product, PurchaseOrder, Vendor } from '../src/types/api'

const api = process.env.E2E_API_BASE_URL || 'http://localhost:8080'

test('create and edit a draft, view and search it, then order and enforce read-only state', async ({
  page,
  request,
}, testInfo) => {
  const tag = `PO-UI-${Date.now()}`
  const vendorResponse = await request.post(`${api}/api/vendors`, {
    data: { name: `${tag} Supplier` },
  })
  expect(vendorResponse.status()).toBe(201)
  const vendor = (await vendorResponse.json()) as Vendor
  const products: Product[] = []
  for (const [suffix, unitCost] of [
    ['A', '12.50'],
    ['B', '3.25'],
  ]) {
    const response = await request.post(`${api}/api/products`, {
      data: { sku: `${tag}-${suffix}`, name: `PO fixture ${suffix}`, unitCost },
    })
    expect(response.status()).toBe(201)
    products.push((await response.json()) as Product)
  }
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/purchase-orders/new')
  await page.getByRole('searchbox', { name: 'Search vendor', exact: true }).fill(tag)
  await expect(page.getByRole('option', { name: vendor.name })).toBeAttached()
  await page.locator('#vendorId').selectOption(String(vendor.id))
  await page.getByRole('searchbox', { name: 'Search product 1', exact: true }).fill(tag)
  await expect(
    page.getByRole('option', { name: `${products[0].sku} · ${products[0].name}` }),
  ).toBeAttached()
  await page.getByRole('combobox', { name: 'Product 1' }).selectOption(String(products[0].id))
  await page.getByLabel('Quantity 1').fill('2')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByRole('searchbox', { name: 'Search product 2', exact: true }).fill(tag)
  await expect(
    page
      .getByRole('combobox', { name: 'Product 2' })
      .getByRole('option', { name: `${products[1].sku} · ${products[1].name}` }),
  ).toBeAttached()
  await page.getByRole('combobox', { name: 'Product 2' }).selectOption(String(products[1].id))
  await page.getByLabel('Quantity 2').fill('4')
  await expect(page.getByTestId('po-subtotal')).toHaveText('$38.00')
  await expect(
    page.getByRole('combobox', { name: 'Product 2' }).locator(`option[value="${products[0].id}"]`),
  ).toBeDisabled()
  await page.screenshot({
    path: testInfo.outputPath('purchase-order-draft-desktop.png'),
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: 'Create draft', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({
    path: testInfo.outputPath('purchase-order-draft-mobile.png'),
    fullPage: true,
  })
  await page.setViewportSize({ width: 1280, height: 720 })
  const savedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/purchase-orders') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Create draft', exact: true }).click()
  const created = (await (await savedResponse).json()) as PurchaseOrder
  await expect(page.getByRole('heading', { name: created.poNumber })).toBeVisible()
  await expect(page.getByText('Draft', { exact: true })).toBeVisible()
  await expect(page.getByRole('table')).toContainText('$25.00')
  await page.getByRole('link', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Quantity 1').fill('3')
  await expect(page.getByTestId('po-subtotal')).toHaveText('$50.50')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Purchase order updated.' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Back to purchase orders' }).click()
  await page.getByRole('searchbox', { name: 'Search purchase orders' }).fill(created.poNumber)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const row = page.getByRole('row').filter({ hasText: created.poNumber })
  await expect(row).toContainText('$50.50')
  await expect(row).toContainText('Draft')
  await row.getByRole('link', { name: 'View', exact: true }).click()
  await page.getByRole('button', { name: 'Mark ordered', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click()
  await expect(page.getByText('Ordered', { exact: true }).locator('.status-dot')).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0)
  await expect(page.getByText('This purchase order is read-only.', { exact: false })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: created.poNumber })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: testInfo.outputPath('purchase-order-ordered-mobile.png'),
    fullPage: true,
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.goto(`/purchase-orders/${created.id}/edit`)
  await expect(
    page.getByRole('heading', { name: 'This purchase order is read-only' }),
  ).toBeVisible()
  const forbidden = await request.put(`${api}/api/purchase-orders/${created.id}`, {
    data: { vendorId: vendor.id, items: [{ productId: products[0].id, quantity: 1 }] },
  })
  expect(forbidden.status()).toBe(409)
  expect(errors).toEqual([])
})

test('cancel a draft from the list and filter cancelled orders', async ({ page, request }) => {
  const vendors = (await (await request.get(`${api}/api/vendors?active=true&size=1`)).json()) as {
    content: Vendor[]
  }
  const products = (await (await request.get(`${api}/api/products?active=true&size=1`)).json()) as {
    content: Product[]
  }
  const response = await request.post(`${api}/api/purchase-orders`, {
    data: {
      vendorId: vendors.content[0].id,
      items: [{ productId: products.content[0].id, quantity: 1 }],
    },
  })
  expect(response.status()).toBe(201)
  const order = (await response.json()) as PurchaseOrder
  await page.goto(`/purchase-orders?search=${order.poNumber}`)
  await page.getByRole('button', { name: 'Cancel PO', exact: true }).click()
  await page.getByRole('button', { name: 'Keep draft', exact: true }).click()
  await expect(page.getByRole('table').getByText('Draft', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel PO', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm cancellation', exact: true }).click()
  await expect(page.getByRole('row').filter({ hasText: order.poNumber })).toContainText('Cancelled')
  await page.getByLabel('Status filter').selectOption('DRAFT')
  await expect(page.getByText('No purchase orders found')).toBeVisible()
  await page.getByLabel('Status filter').selectOption('CANCELLED')
  await expect(page.getByRole('row').filter({ hasText: order.poNumber })).toBeVisible()
  await page.getByRole('link', { name: 'View', exact: true }).click()
  await expect(page.getByText('This purchase order is read-only.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark ordered', exact: true })).toHaveCount(0)
})
