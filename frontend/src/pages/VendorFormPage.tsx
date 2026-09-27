import { useState, type FormEvent } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Vendor, VendorInput } from '../types/api'
import { ApiError, errorMessage, vendorApi } from '../services/api'
import { useResource } from '../hooks/useResource'
import { useNotice } from '../hooks/useNotice'
import { PageHeader } from '../components/PageHeader'
import { Field } from '../components/Field'
import { ErrorState, LoadingState } from '../components/States'

export function VendorFormPage() {
  const { id } = useParams()
  const result = useResource<Vendor>(id ? `/api/vendors/${id}` : null)
  if (id && result.loading) return <LoadingState />
  if (id && result.error)
    return (
      <>
        <Link className="back-link" to="/vendors">
          <ArrowLeft size={15} />
          Back to vendors
        </Link>
        <ErrorState message={result.error} retry={result.refresh} />
      </>
    )
  if (id && !result.data) return null
  return <VendorForm key={id || 'new'} vendor={id ? result.data! : undefined} />
}

function VendorForm({ vendor }: { vendor?: Vendor }) {
  const navigate = useNavigate()
  const notify = useNotice()
  const [values, setValues] = useState({
    name: vendor?.name || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    active: vendor?.active ?? true,
  })
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  function change(field: keyof typeof values, value: string | boolean) {
    setValues((previous) => ({ ...previous, [field]: value }))
    setFields((previous) => ({ ...previous, [field]: '' }))
  }
  function inputProps(field: 'name' | 'email' | 'phone') {
    return {
      id: field,
      name: field,
      value: values[field],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => change(field, event.target.value),
      'aria-invalid': Boolean(fields[field]),
      'aria-describedby': fields[field] ? `${field}-error` : undefined,
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (!values.name.trim()) {
      setFields({ name: 'Name is required' })
      return
    }
    setSaving(true)
    setError(null)
    setFields({})
    const input: VendorInput = {
      ...values,
      name: values.name.trim(),
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
    }
    try {
      if (vendor) await vendorApi.update(vendor.id, input)
      else await vendorApi.create(input)
      notify(vendor ? 'Vendor updated.' : 'Vendor created.')
      navigate('/vendors')
    } catch (cause) {
      setError(errorMessage(cause))
      if (cause instanceof ApiError) setFields(cause.fields)
    } finally {
      setSaving(false)
    }
  }
  return (
    <>
      <Link className="back-link" to="/vendors">
        <ArrowLeft size={15} />
        Back to vendors
      </Link>
      <PageHeader
        title={vendor ? 'Edit vendor' : 'Add vendor'}
        description="Keep supplier information organized and easy to find."
      />
      <form className="record-form" onSubmit={submit}>
        {error && <ErrorState message={error} />}
        <fieldset disabled={saving}>
          <section className="form-section">
            <div className="form-section-intro">
              <h2>Vendor information</h2>
              <p>Start with a company name and add the best way to reach them.</p>
              <span className="required-note">* Required fields</span>
            </div>
            <div className="form-fields">
              <Field id="name" label="Vendor name" required error={fields.name}>
                <input
                  {...inputProps('name')}
                  required
                  maxLength={160}
                  placeholder="e.g. Caribbean Supply Co."
                />
              </Field>
              <Field id="email" label="Email address" error={fields.email}>
                <input
                  {...inputProps('email')}
                  type="email"
                  maxLength={254}
                  placeholder="sales@example.com"
                />
              </Field>
              <Field id="phone" label="Phone number" error={fields.phone}>
                <input
                  {...inputProps('phone')}
                  type="tel"
                  maxLength={40}
                  placeholder="e.g. +1 787 555 0100"
                />
              </Field>
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
                  <strong>Active vendor</strong>
                  <small>Included when filtering for active vendors.</small>
                </span>
              </label>
            </div>
          </section>
        </fieldset>
        <div className="form-actions">
          <Link className="button secondary" to="/vendors">
            Cancel
          </Link>
          <button type="submit" className="button primary" disabled={saving}>
            <Check size={17} />
            {saving ? 'Saving…' : vendor ? 'Save changes' : 'Create vendor'}
          </button>
        </div>
      </form>
    </>
  )
}
