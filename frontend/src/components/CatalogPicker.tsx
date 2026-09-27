import { useState } from 'react'
import type { PageResponse } from '../types/api'
import { useResource } from '../hooks/useResource'
import { Field } from './Field'

// Paginated lookup keeps every active catalog record reachable without loading the full catalog.
export function CatalogPicker<T extends { id: number; name: string; active: boolean }>({
  id,
  label,
  resource,
  value,
  onChange,
  optionLabel,
  excluded = [],
  error,
}: {
  id: string
  label: string
  resource: 'products' | 'vendors'
  value: T | null
  onChange: (value: T | null) => void
  optionLabel: (value: T) => string
  excluded?: number[]
  error?: string
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const query = new URLSearchParams({ active: 'true', size: '20', page: String(page), search })
  const result = useResource<PageResponse<T>>(`/api/${resource}?${query}`)
  const options = result.data?.content ?? []
  const choices = value && !options.some((o) => o.id === value.id) ? [value, ...options] : options
  return (
    <div className="catalog-picker">
      <Field id={id} label={label} required error={error}>
        <input
          type="search"
          aria-label={`Search ${label.toLowerCase()}`}
          placeholder={`Search ${resource}…`}
          value={search}
          maxLength={200}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(0)
          }}
        />
        <select
          id={id}
          required
          value={value?.id ?? ''}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) =>
            onChange(choices.find((option) => option.id === Number(event.target.value)) ?? null)
          }
        >
          <option value="">Select {resource === 'products' ? 'a product' : 'a vendor'}</option>
          {choices.map((option) => (
            <option key={option.id} value={option.id} disabled={excluded.includes(option.id)}>
              {optionLabel(option)}
              {!option.active ? ' (inactive)' : ''}
            </option>
          ))}
        </select>
      </Field>
      {result.loading && <small role="status">Loading {resource}…</small>}
      {result.error && (
        <p role="alert" className="field-error">
          {result.error}{' '}
          <button type="button" onClick={result.refresh}>
            Retry
          </button>
        </p>
      )}
      {!result.loading && !result.error && options.length === 0 && (
        <small>No active {resource} match this search.</small>
      )}
      {result.data && result.data.totalPages > 1 && (
        <div className="picker-pages">
          <button
            type="button"
            className="button secondary"
            disabled={page === 0 || result.loading}
            onClick={() => setPage(page - 1)}
          >
            Previous options
          </button>
          <small>
            {page + 1} / {result.data.totalPages}
          </small>
          <button
            type="button"
            className="button secondary"
            disabled={result.data.last || result.loading}
            onClick={() => setPage(page + 1)}
          >
            More options
          </button>
        </div>
      )}
    </div>
  )
}
