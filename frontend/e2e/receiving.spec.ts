import { test, expect } from '@playwright/test'
import type {
  Product,
  Vendor,
  PurchaseOrder,
  PageResponse,
  InventoryTransaction,
} from '../src/types/api'

const api = process.env.E2E_API_BASE_URL || 'http://localhost:8080'

test('receive an ordered PO once, update stock, and inspect its immutable inventory history', async ({
  page,
  request,
}, testInfo) => {
  const tag = `RECEIVE-UI-${Date.now()}`
  const productResponse = await request.post(`${api}/api/products`, {
    data: {
      sku: tag,
      name: `${tag} Gloves`,
      unitCost: '12.50',
      quantityOnHand: 20,
      reorderPoint: 25,
    },
  })
  expect(productResponse.status()).toBe(201)
  const product = (await productResponse.json()) as Product
  const vendorResponse = await request.post(`${api}/api/vendors`, {
    data: { name: `${tag} Supply` },
  })
  expect(vendorResponse.status()).toBe(201)
  const vendor = (await vendorResponse.json()) as Vendor
  await page.goto('/purchase-orders/new')
  await page.getByRole('searchbox', { name: 'Search vendor', exact: true }).fill(tag)
  await expect(page.getByRole('option', { name: vendor.name })).toBeAttached()
  await page.locator('#vendorId').selectOption(String(vendor.id))
  await page.getByRole('searchbox', { name: 'Search product 1', exact: true }).fill(tag)
  await expect(
    page.getByRole('option', { name: `${product.sku} · ${product.name}` }),
  ).toBeAttached()
  await page.getByRole('combobox', { name: 'Product 1' }).selectOption(String(product.id))
  await page.getByLabel('Quantity 1').fill('50')
  const createdResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/purchase-orders') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Create draft', exact: true }).click()
  const order = (await (await createdResponse).json()) as PurchaseOrder
  await expect(page.getByRole('heading', { name: order.poNumber })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Receive purchase order' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Mark ordered', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Receive purchase order', exact: true }),
  ).toBeVisible()
  const before = (await (await request.get(`${api}/api/products/${product.id}`)).json()) as Product
  expect(before.quantityOnHand).toBe(20)
  await page.getByRole('button', { name: 'Receive purchase order', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText(
    'will add all ordered quantities to inventory. This action cannot be undone.',
  )
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Receive purchase order', exact: true }).click()
  await page.getByRole('button', { name: 'Receive order', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Purchase order received. Inventory updated.' }),
  ).toBeVisible()
  await expect(page.locator('.badge-received')).toHaveText('Received')
  await expect(
    page.getByRole('button', { name: 'Receive purchase order', exact: true }),
  ).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0)
  await expect(page.getByText('Inventory updated on receipt.', { exact: false })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('received-order.png'), fullPage: true })
  await page.getByRole('link', { name: 'Products', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search records' }).fill(tag)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const productRow = page.getByRole('row').filter({ hasText: tag })
  await expect(productRow).toContainText('70 units')
  await expect(productRow).toContainText('In stock')
  await productRow.getByRole('link', { name: `Inventory history for ${product.name}` }).click()
  await expect(page.getByRole('heading', { name: 'Inventory Activity', exact: true })).toBeVisible()
  const entry = page.getByRole('row').filter({ hasText: order.poNumber })
  await expect(entry).toContainText('Purchase Receipt')
  await expect(entry).toContainText('+50')
  await expect(entry.getByRole('cell').nth(5)).toHaveText('20')
  await expect(entry.getByRole('cell').nth(6)).toHaveText('70')
  await page.getByRole('searchbox', { name: 'PO reference' }).fill(order.poNumber)
  await page.getByRole('button', { name: 'Filter', exact: true }).click()
  await expect(page.getByRole('row')).toHaveCount(2)
  await page.screenshot({ path: testInfo.outputPath('inventory-activity.png'), fullPage: true })
  const duplicate = await request.post(`${api}/api/purchase-orders/${order.id}/receive`)
  expect(duplicate.status()).toBe(409)
  expect(((await duplicate.json()) as { code: string }).code).toBe(
    'PURCHASE_ORDER_ALREADY_RECEIVED',
  )
  const after = (await (await request.get(`${api}/api/products/${product.id}`)).json()) as Product
  expect(after.quantityOnHand).toBe(70)
  const ledger = (await (
    await request.get(`${api}/api/inventory-transactions?referenceId=${order.poNumber}`)
  ).json()) as PageResponse<InventoryTransaction>
  expect(ledger.totalElements).toBe(1)
  expect(ledger.content[0]).toMatchObject({
    balanceBefore: 20,
    balanceAfter: 70,
    quantity: 50,
    referenceId: order.poNumber,
  })
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Recent Inventory Activity' })).toBeVisible()
  await expect(
    page.getByRole('table', { name: 'Recent inventory activity', exact: true }),
  ).toContainText(order.poNumber)
  await page.goto(`/purchase-orders/${order.id}/edit`)
  await expect(
    page.getByRole('heading', { name: 'This purchase order is read-only' }),
  ).toBeVisible()
})
