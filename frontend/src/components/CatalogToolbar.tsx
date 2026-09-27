import { Search, SlidersHorizontal } from 'lucide-react'
import { useState, type FormEvent } from 'react'

export function CatalogToolbar({
  search,
  active,
  placeholder,
  onSearch,
  onActive,
  onClear,
}: {
  search: string
  active: string
  placeholder: string
  onSearch: (value: string) => void
  onActive: (value: string) => void
  onClear: () => void
}) {
  const [draft, setDraft] = useState(search)
  function submit(event: FormEvent) {
    event.preventDefault()
    onSearch(draft.trim())
  }
  return (
    <div className="catalog-toolbar">
      <form className="search-form" onSubmit={submit} role="search">
        <Search size={17} aria-hidden="true" />
        <input
          aria-label="Search records"
          placeholder={placeholder}
          value={draft}
          maxLength={200}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="search-button">
          Search
        </button>
      </form>
      <div className="filter-control">
        <SlidersHorizontal size={15} aria-hidden="true" />
        <label htmlFor="active-filter" className="sr-only">
          Active filter
        </label>
        <select
          id="active-filter"
          value={active}
          onChange={(event) => onActive(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>
      {(search || active) && (
        <button
          className="text-button"
          onClick={() => {
            setDraft('')
            onClear()
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
