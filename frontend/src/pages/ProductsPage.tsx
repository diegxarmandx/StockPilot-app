import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Pencil, Plus, History } from 'lucide-react'
import type { Product } from '../types/api'
import { productApi, errorMessage } from '../services/api'
import { useCatalog } from '../hooks/useCatalog'
import { useNotice } from '../hooks/useNotice'
import { PageHeader } from '../components/PageHeader'
import { CatalogToolbar } from '../components/CatalogToolbar'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import { DeactivateDialog } from '../components/DeactivateDialog'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { formatMoney } from '../services/format'

export function ProductsPage() {
  const catalog = useCatalog<Product>('products')
  const notify = useNotice()
  const [target, setTarget] = useState<Product | null>(null)
  const [busy, setBusy] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  async function deactivate() {
    if (!target || busy) return
    setBusy(true)
    setMutationError(null)
    try {
      await productApi.deactivate(target.id)
      notify('Product deactivated.')
      setTarget(null)
      if (catalog.data?.content.length === 1 && catalog.page > 0)
        catalog.change({ page: catalog.page - 1 })
      else catalog.refresh()
    } catch (error) {
      setMutationError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage products, pricing, stock levels, and reorder thresholds."
        action={
          <Link className="button primary" to="/products/new">
            <Plus size={17} />
            Add product
          </Link>
        }
      />
      <section className="catalog-panel" aria-label="Product catalog">
        <div className="panel-heading">
          <h2>All products</h2>
          {catalog.data && <span className="count-badge">{catalog.data.totalElements}</span>}
        </div>
        <CatalogToolbar
          key={catalog.search}
          search={catalog.search}
          active={catalog.active}
          placeholder="Search by SKU or product name…"
          onSearch={(search) => catalog.change({ search })}
          onActive={(active) => catalog.change({ active })}
          onClear={() => catalog.change({ search: '', active: '' })}
        />
        {catalog.loading ? (
          <LoadingState />
        ) : catalog.error ? (
          <ErrorState
            title="Unable to load products."
            message={catalog.error}
            retry={catalog.refresh}
          />
        ) : (
          catalog.data && (
            <>
              {catalog.data.content.length === 0 ? (
                <EmptyState
                  title={catalog.search || catalog.active ? 'No products found' : 'No products yet'}
                  description={
                    catalog.search || catalog.active
                      ? 'Try a different search or clear your filters.'
                      : 'Add your first product to begin building your catalog.'
                  }
                />
              ) : (
                <div className="table-scroll" tabIndex={0} role="region" aria-label="Product table">
                  <table>
                    <caption className="sr-only">Product catalog</caption>
                    <thead>
                      <tr>
                        <th scope="col">SKU</th>
                        <th scope="col">Product</th>
                        <th scope="col">Unit Cost</th>
                        <th scope="col">Stock</th>
                        <th scope="col">Reorder Point</th>
                        <th scope="col">Status</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalog.data.content.map((record) => (
                        <tr key={record.id}>
                          <td className="mono sku-cell">{record.sku}</td>
                          <td>
                            <strong className="record-name" title={record.name}>
                              {record.name}
                            </strong>
                            <span
                              className="record-description"
                              title={record.description || undefined}
                            >
                              {record.description || '—'}
                            </span>
                          </td>
                          <td className="numeric mono">{formatMoney(record.unitCost)}</td>
                          <td className={`numeric stock-${record.stockStatus.toLowerCase()}`}>
                            <strong>{record.quantityOnHand.toLocaleString()}</strong>
                            <span className="unit-label"> units</span>
                          </td>
                          <td className="numeric text-muted">
                            {record.reorderPoint.toLocaleString()}
                          </td>
                          <td>
                            <StatusBadge status={record.stockStatus} />
                          </td>
                          <td>
                            <div className="row-actions">
                              <Link
                                className="icon-button"
                                to={`/inventory?productId=${record.id}`}
                                aria-label={`Inventory history for ${record.name}`}
                                title="Inventory history"
                              >
                                <History size={15} />
                              </Link>
                              <Link
                                className="icon-button"
                                aria-label={`Edit ${record.name}`}
                                title="Edit product"
                                to={`/products/${record.id}/edit`}
                              >
                                <Pencil size={15} />
                              </Link>
                              <button
                                className="icon-button"
                                aria-label={`Deactivate ${record.name}`}
                                title={record.active ? 'Deactivate product' : 'Already inactive'}
                                disabled={!record.active}
                                onClick={() => {
                                  setTarget(record)
                                  setMutationError(null)
                                }}
                              >
                                <Archive size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination {...catalog.data} onPage={(page) => catalog.change({ page })} />
            </>
          )
        )}
      </section>
      <p className="catalog-note">
        Stock status is based on quantity on hand and the reorder point.
      </p>
      {target && (
        <DeactivateDialog
          name={target.name}
          busy={busy}
          error={mutationError}
          onCancel={() => setTarget(null)}
          onConfirm={deactivate}
        />
      )}
    </>
  )
}
