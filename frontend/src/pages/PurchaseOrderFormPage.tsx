import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ProductChoice, PurchaseOrder, PurchaseOrderInput, VendorChoice } from '../types/api'
import { ApiError, errorMessage, purchaseOrderApi } from '../services/api'
import { centsDecimal, formatMoney, moneyCents } from '../services/format'
import { useResource } from '../hooks/useResource'
import { useNotice } from '../hooks/useNotice'
import { StatusBadge } from '../components/StatusBadge'
import { PageHeader } from '../components/PageHeader'
import { CatalogPicker } from '../components/CatalogPicker'
import { Field } from '../components/Field'
import { ErrorState, LoadingState } from '../components/States'

type ItemRow = { key: string; product: ProductChoice | null; quantity: string }
const emptyRow = (): ItemRow => ({ key: crypto.randomUUID(), product: null, quantity: '1' })
const validQuantity = (value: string) =>
  /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 2147483647

export function PurchaseOrderFormPage() {
  const { id } = useParams()
  const result = useResource<PurchaseOrder>(id ? `/api/purchase-orders/${id}` : null)
  if (id && result.loading) return <LoadingState />
  if (id && result.error) return <ErrorState message={result.error} retry={result.refresh} />
  if (id && !result.data) return null
  if (id && result.data?.status !== 'DRAFT')
    return (
      <section className="empty-state">
        <h1>This purchase order is read-only</h1>
        <p>Only draft purchase orders can be edited.</p>
        <Link className="button secondary" to={`/purchase-orders/${id}`}>
          View purchase order
        </Link>
      </section>
    )
  return <PurchaseOrderForm key={id || 'new'} order={id ? result.data! : undefined} />
}
function PurchaseOrderForm({ order }: { order?: PurchaseOrder }) {
  const navigate = useNavigate()
  const notify = useNotice()
  const [vendor, setVendor] = useState<VendorChoice | null>(order?.vendor ?? null)
  const [rows, setRows] = useState<ItemRow[]>(() =>
    order
      ? order.items.map((item) => ({
          key: crypto.randomUUID(),
          quantity: String(item.quantity),
          product: {
            id: item.productId,
            name: item.productName,
            sku: item.sku,
            active: item.productActive,
            unitCost: item.unitCost,
          },
        }))
      : [emptyRow()],
  )
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const snapshots = new Map(order?.items.map((item) => [item.productId, item.unitCost]))
  const price = (row: ItemRow) =>
    row.product ? (snapshots.get(row.product.id) ?? row.product.unitCost) : '0.00'
  const lineCents = (row: ItemRow) =>
    validQuantity(row.quantity) ? moneyCents(price(row)) * BigInt(row.quantity) : 0n
  const subtotal = rows.reduce((sum, row) => sum + lineCents(row), 0n)
  function changeRow(key: string, update: Partial<ItemRow>) {
    setRows((previous) => previous.map((row) => (row.key === key ? { ...row, ...update } : row)))
    setFields({})
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const invalid: Record<string, string> = {}
    if (!vendor?.active) invalid.vendorId = 'Select an active vendor'
    const ids = new Set<number>()
    rows.forEach((row, i) => {
      if (!row.product?.active) invalid[`items[${i}].productId`] = 'Select an active product'
      if (row.product && ids.has(row.product.id))
        invalid[`items[${i}].productId`] = 'Each product can appear only once'
      if (row.product) ids.add(row.product.id)
      if (!validQuantity(row.quantity))
        invalid[`items[${i}].quantity`] = 'Enter a whole number from 1 to 2,147,483,647'
    })
    setFields(invalid)
    if (Object.keys(invalid).length || !vendor) return
    const input: PurchaseOrderInput = {
      vendorId: vendor.id,
      items: rows.map((row) => ({ productId: row.product!.id, quantity: Number(row.quantity) })),
    }
    setSaving(true)
    setError(null)
    try {
      const saved = order
        ? await purchaseOrderApi.update(order.id, input)
        : await purchaseOrderApi.create(input)
      notify(order ? 'Purchase order updated.' : 'Draft purchase order created.')
      navigate(`/purchase-orders/${saved.id}`)
    } catch (cause) {
      setError(errorMessage(cause))
      if (cause instanceof ApiError) setFields(cause.fields)
    } finally {
      setSaving(false)
    }
  }
  const back = order ? `/purchase-orders/${order.id}` : '/purchase-orders'
  return (
    <>
      <Link className="back-link" to={back}>
        ← Back to {order ? order.poNumber : 'purchase orders'}
      </Link>
      <PageHeader
        title={order ? `Edit ${order.poNumber}` : 'New purchase order'}
        description="Choose a supplier and the products you plan to purchase."
      />
      <form className="record-form po-form" onSubmit={submit}>
        {error && <ErrorState message={error} />}
        <div className="po-form-grid">
          <fieldset disabled={saving}>
            <section className="form-section">
              <div className="form-section-intro">
                <h2>Supplier</h2>
                <p>Select an active vendor for this purchase order.</p>
              </div>
              <CatalogPicker<VendorChoice>
                id="vendorId"
                label="Vendor"
                resource="vendors"
                value={vendor}
                onChange={(value) => {
                  setVendor(value)
                  setFields({})
                }}
                optionLabel={(value) => value.name}
                error={fields.vendorId}
              />
            </section>
            <section className="po-items-section">
              <div className="po-section-heading">
                <div>
                  <h2>Order items</h2>
                  <p>Choose products and enter the quantities to order.</p>
                </div>
                <button
                  className="button secondary"
                  type="button"
                  disabled={rows.length >= 100}
                  onClick={() => setRows([...rows, emptyRow()])}
                >
                  Add item
                </button>
              </div>
              {fields.items && (
                <p className="field-error" role="alert">
                  {fields.items}
                </p>
              )}
              {rows.map((row, i) => (
                <div className="po-item-row" key={row.key}>
                  <CatalogPicker<ProductChoice>
                    id={`product-${row.key}`}
                    label={`Product ${i + 1}`}
                    resource="products"
                    value={row.product}
                    onChange={(product) => changeRow(row.key, { product })}
                    optionLabel={(product) => `${product.sku} · ${product.name}`}
                    excluded={rows
                      .filter((other) => other.key !== row.key && other.product)
                      .map((other) => other.product!.id)}
                    error={fields[`items[${i}].productId`]}
                  />
                  <Field
                    id={`quantity-${row.key}`}
                    label={`Quantity ${i + 1}`}
                    required
                    error={fields[`items[${i}].quantity`]}
                  >
                    <input
                      id={`quantity-${row.key}`}
                      type="number"
                      min="1"
                      max="2147483647"
                      step="1"
                      required
                      value={row.quantity}
                      onChange={(event) => changeRow(row.key, { quantity: event.target.value })}
                    />
                  </Field>
                  <div className="po-line-price">
                    <span>Unit cost</span>
                    <strong className="mono">{formatMoney(price(row))}</strong>
                  </div>
                  <div className="po-line-price">
                    <span>Line total</span>
                    <strong className="mono">{formatMoney(centsDecimal(lineCents(row)))}</strong>
                  </div>
                  <button
                    type="button"
                    className="button ghost"
                    aria-label={`Remove item ${i + 1}`}
                    disabled={rows.length === 1}
                    onClick={() => {
                      setRows(rows.filter((other) => other.key !== row.key))
                      setFields({})
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </section>
          </fieldset>
          <aside className="po-summary" aria-label="Order summary">
            <h2>Order summary</h2>
            <StatusBadge status="DRAFT" />
            <dl>
              <div>
                <dt>Items</dt>
                <dd>{rows.filter((row) => row.product).length}</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd data-testid="po-subtotal">{formatMoney(centsDecimal(subtotal))}</dd>
              </div>
              <div className="summary-total">
                <dt>
                  Total <span>USD</span>
                </dt>
                <dd>{formatMoney(centsDecimal(subtotal))}</dd>
              </div>
            </dl>
            <p>
              Prices and totals are confirmed when you save. Stock changes only when this order is
              received.
            </p>
          </aside>
        </div>
        <div className="form-actions">
          <Link className="button secondary" to={back}>
            Discard changes
          </Link>
          <button type="submit" className="button primary" disabled={saving}>
            {saving ? 'Saving…' : order ? 'Save changes' : 'Create draft'}
          </button>
        </div>
      </form>
    </>
  )
}
