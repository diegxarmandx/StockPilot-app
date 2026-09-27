import { useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Info } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Product, ProductInput } from '../types/api'
import { ApiError, errorMessage, productApi } from '../services/api'
import { useResource } from '../hooks/useResource'
import { useNotice } from '../hooks/useNotice'
import { PageHeader } from '../components/PageHeader'
import { Field } from '../components/Field'
import { ErrorState, LoadingState } from '../components/States'

export function ProductFormPage() {
  const { id } = useParams()
  const result = useResource<Product>(id ? `/api/products/${id}` : null)
  if (id && result.loading) return <LoadingState />
  if (id && result.error)
    return (
      <>
        <Link className="back-link" to="/products">
          <ArrowLeft size={15} />
          Back to products
        </Link>
        <ErrorState message={result.error} retry={result.refresh} />
      </>
    )
  if (id && !result.data) return null
  return <ProductForm key={id || 'new'} product={id ? result.data! : undefined} />
}

function ProductForm({ product }: { product?: Product }) {
  const navigate = useNavigate()
  const notify = useNotice()
  const [values, setValues] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    description: product?.description || '',
    unitCost: product?.unitCost || '',
    quantityOnHand: String(product?.quantityOnHand ?? 0),
    reorderPoint: String(product?.reorderPoint ?? 0),
    active: product?.active ?? true,
  })
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  function change(field: keyof typeof values, value: string | boolean) {
    setValues((previous) => ({ ...previous, [field]: value }))
    setFields((previous) => ({ ...previous, [field]: '' }))
  }
  function inputProps(field: Exclude<keyof typeof values, 'active'>) {
    return {
      id: field,
      name: field,
      value: values[field],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        change(field, event.target.value),
      'aria-invalid': Boolean(fields[field]),
      'aria-describedby': fields[field] ? `${field}-error` : undefined,
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const invalid: Record<string, string> = {}
    if (!values.sku.trim()) invalid.sku = 'SKU is required'
    if (!values.name.trim()) invalid.name = 'Name is required'
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(values.unitCost))
      invalid.unitCost = 'Use a nonnegative amount with up to two decimal places'
    for (const field of ['quantityOnHand', 'reorderPoint'] as const) {
      if (!/^\d+$/.test(values[field]) || Number(values[field]) > 2147483647)
        invalid[field] = 'Enter a whole number from 0 to 2,147,483,647'
    }
    setFields(invalid)
    if (Object.keys(invalid).length) return
    setSaving(true)
    setError(null)
    const input: ProductInput = {
      ...values,
      sku: values.sku.trim(),
      name: values.name.trim(),
      description: values.description.trim() || null,
      quantityOnHand: Number(values.quantityOnHand),
      reorderPoint: Number(values.reorderPoint),
    }
    try {
      if (product) await productApi.update(product.id, input)
      else await productApi.create(input)
      notify(product ? 'Product updated.' : 'Product created.')
      navigate('/products')
    } catch (cause) {
      setError(errorMessage(cause))
      if (cause instanceof ApiError) setFields(cause.fields)
    } finally {
      setSaving(false)
    }
  }
  return (
    <>
      <Link className="back-link" to="/products">
        <ArrowLeft size={15} />
        Back to products
      </Link>
      <PageHeader
        eyebrow="Inventory / Product details"
        title={product ? 'Edit product' : 'New product'}
        description="The essential details that keep your catalog consistent."
      />
      <form className="record-form" onSubmit={submit}>
        {error && <ErrorState message={error} />}
        <fieldset disabled={saving}>
          <section className="form-section">
            <div className="form-section-intro">
              <h2>Product information</h2>
              <p>Give this product a unique SKU and a clear, recognizable name.</p>
              <span className="required-note">* Required fields</span>
            </div>
            <div className="form-fields">
              <Field
                id="sku"
                label="SKU"
                required
                error={fields.sku}
                hint="A unique identifier. SKUs are case-sensitive."
              >
                <input {...inputProps('sku')} required maxLength={64} placeholder="e.g. SKU-004" />
              </Field>
              <Field id="name" label="Product name" required error={fields.name}>
                <input
                  {...inputProps('name')}
                  required
                  maxLength={160}
                  placeholder="e.g. Industrial safety gloves"
                />
              </Field>
              <Field id="description" label="Description" error={fields.description}>
                <textarea
                  {...inputProps('description')}
                  maxLength={4000}
                  rows={3}
                  placeholder="Add specifications or a short description (optional)"
                />
              </Field>
            </div>
          </section>
          <section className="form-section">
            <div className="form-section-intro">
              <h2>Cost & stock</h2>
              <p>Set the unit cost and your initial inventory levels.</p>
            </div>
            <div className="form-fields">
              <Field id="unitCost" label="Unit cost (USD)" required error={fields.unitCost}>
                <input
                  {...inputProps('unitCost')}
                  type="number"
                  required
                  min="0"
                  max="9999999999.99"
                  step="0.01"
                  placeholder="0.00"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field
                  id="quantityOnHand"
                  label="Quantity on hand"
                  required
                  error={fields.quantityOnHand}
                >
                  <input
                    {...inputProps('quantityOnHand')}
                    type="number"
                    required
                    min="0"
                    max="2147483647"
                    step="1"
                  />
                </Field>
                <Field id="reorderPoint" label="Reorder point" required error={fields.reorderPoint}>
                  <input
                    {...inputProps('reorderPoint')}
                    type="number"
                    required
                    min="0"
                    max="2147483647"
                    step="1"
                  />
                </Field>
              </div>
              <div className="info-note">
                <Info size={17} />
                <p>
                  Stock can be entered during initial setup. Inventory transactions will manage
                  future changes.
                </p>
              </div>
            </div>
          </section>
          <section className="form-section">
            <div className="form-section-intro">
              <h2>Availability</h2>
              <p>Keep this record active or retain it as inactive.</p>
            </div>
            <div className="form-fields">
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={values.active}
                  onChange={(event) => change('active', event.target.checked)}
                />
                <span>
                  <strong>Active product</strong>
                  <small>Included when filtering for active products.</small>
                </span>
              </label>
            </div>
          </section>
        </fieldset>
        <div className="form-actions">
          <Link className="button secondary" to="/products">
            Cancel
          </Link>
          <button type="submit" className="button primary" disabled={saving}>
            <Check size={17} />
            {saving ? 'Saving…' : product ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </form>
    </>
  )
}
