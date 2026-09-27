import { useSearchParams } from 'react-router-dom'
import type { InventoryTransaction, PageResponse, Product } from '../types/api'
import { useResource } from '../hooks/useResource'
import { PageHeader } from '../components/PageHeader'
import { InventoryActivityTable } from '../components/InventoryActivityTable'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { Pagination } from '../components/Pagination'

export function InventoryPage() {
  const [params, setParams] = useSearchParams()
  const reference = params.get('referenceId') || ''
  const productId = params.get('productId') || ''
  const rawPage = Number(params.get('page') || 0)
  const page = Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : 0
  const query = new URLSearchParams({ page: String(page), size: '10' })
  if (reference) query.set('referenceId', reference)
  if (productId) query.set('productId', productId)
  const result = useResource<PageResponse<InventoryTransaction>>(
    `/api/inventory-transactions?${query}`,
  )
  const product = useResource<Product>(productId ? `/api/products/${productId}` : null)
  return (
    <>
      <PageHeader
        title="Inventory Activity"
        description="Review inventory movements and purchase-order receipts."
      />
      <section className="catalog-panel" aria-label="Inventory activity">
        <div className="panel-heading">
          <h2>{productId ? product.data?.name || 'Product history' : 'All inventory activity'}</h2>
          {result.data && <span className="count-badge">{result.data.totalElements}</span>}
        </div>
        <form
          className="po-toolbar"
          key={reference}
          onSubmit={(event) => {
            event.preventDefault()
            const next = new URLSearchParams(params)
            const value = String(new FormData(event.currentTarget).get('referenceId') || '').trim()
            if (value) next.set('referenceId', value)
            else next.delete('referenceId')
            next.delete('page')
            setParams(next)
          }}
        >
          <input
            name="referenceId"
            type="search"
            aria-label="PO reference"
            placeholder="Exact PO number, e.g. PO-2026-000001"
            maxLength={40}
            defaultValue={reference}
          />
          <button type="submit" className="button secondary">
            Filter
          </button>
          {(reference || productId) && (
            <button type="button" className="button secondary" onClick={() => setParams({})}>
              Clear filters
            </button>
          )}
        </form>
        {result.loading ? (
          <LoadingState />
        ) : result.error ? (
          <ErrorState
            title="Unable to load inventory activity."
            message={result.error}
            retry={result.refresh}
          />
        ) : (
          result.data && (
            <>
              {result.data.content.length ? (
                <InventoryActivityTable entries={result.data.content} />
              ) : (
                <EmptyState
                  title={
                    reference || productId
                      ? 'No inventory activity found'
                      : 'No inventory activity yet'
                  }
                  description={
                    reference || productId
                      ? 'Try clearing your filters.'
                      : 'Inventory movements will appear after purchase orders are received.'
                  }
                />
              )}
              <Pagination
                {...result.data}
                onPage={(nextPage) => {
                  const next = new URLSearchParams(params)
                  next.set('page', String(nextPage))
                  setParams(next)
                }}
              />
            </>
          )
        )}
      </section>
      <p className="catalog-note">
        Opening stock is set when a product is created. Purchase receipts record every subsequent
        stock increase.
      </p>
    </>
  )
}
