import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { PageResponse, PurchaseOrderSummary } from '../types/api'
import { useResource } from '../hooks/useResource'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { PurchaseOrderActions } from '../components/PurchaseOrderActions'
import { formatDate, formatMoney } from '../services/format'

export function PurchaseOrdersPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') || ''
  const status = params.get('status') || ''
  const parsedPage = Number(params.get('page') || 0)
  const page = Number.isInteger(parsedPage) && parsedPage >= 0 ? parsedPage : 0
  const query = new URLSearchParams({ size: '10', page: String(page) })
  if (search) query.set('search', search)
  if (status) query.set('status', status)
  const result = useResource<PageResponse<PurchaseOrderSummary>>(`/api/purchase-orders?${query}`)
  function change(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }
  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="Create, track, order, and receive purchase orders."
        action={
          <Link className="button primary" to="/purchase-orders/new">
            <Plus size={17} />
            New purchase order
          </Link>
        }
      />
      <section className="catalog-panel" aria-label="Purchase orders">
        <div className="panel-heading">
          <h2>All purchase orders</h2>
          {result.data && <span className="count-badge">{result.data.totalElements}</span>}
        </div>
        <form
          className="po-toolbar"
          key={search}
          onSubmit={(event) => {
            event.preventDefault()
            change('search', String(new FormData(event.currentTarget).get('search') || '').trim())
          }}
        >
          <input
            name="search"
            type="search"
            aria-label="Search purchase orders"
            placeholder="Search PO number or vendor…"
            defaultValue={search}
            maxLength={200}
          />
          <button className="button secondary" type="submit">
            Search
          </button>
          <select
            aria-label="Status filter"
            value={status}
            onChange={(event) => change('status', event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ORDERED">Ordered</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="RECEIVED">Received</option>
          </select>
          {(search || status) && (
            <button type="button" className="button secondary" onClick={() => setParams({})}>
              Clear filters
            </button>
          )}
        </form>
        {result.loading ? (
          <LoadingState />
        ) : result.error ? (
          <ErrorState
            title="Unable to load purchase orders."
            message={result.error}
            retry={result.refresh}
          />
        ) : (
          result.data && (
            <>
              {result.data.content.length === 0 ? (
                <EmptyState
                  title={search || status ? 'No purchase orders found' : 'No purchase orders yet'}
                  description={
                    search || status
                      ? 'Try another search or clear your filters.'
                      : 'Create a purchase order to begin tracking procurement.'
                  }
                />
              ) : (
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Purchase orders table"
                >
                  <table>
                    <caption className="sr-only">Purchase orders</caption>
                    <thead>
                      <tr>
                        {[
                          'PO Number',
                          'Vendor',
                          'Status',
                          'Items',
                          'Total',
                          'Created',
                          'Actions',
                        ].map((name) => (
                          <th scope="col" key={name}>
                            {name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.content.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <Link className="po-number mono" to={`/purchase-orders/${order.id}`}>
                              {order.poNumber}
                            </Link>
                          </td>
                          <td>
                            <strong className="record-name">{order.vendor.name}</strong>
                          </td>
                          <td>
                            <StatusBadge status={order.status} />
                          </td>
                          <td>{order.itemCount}</td>
                          <td className="mono numeric">{formatMoney(order.total)}</td>
                          <td>{formatDate(order.createdAt)}</td>
                          <td>
                            <div className="po-table-actions">
                              <Link
                                to={`/purchase-orders/${order.id}`}
                                className="button secondary"
                              >
                                View
                              </Link>
                              <PurchaseOrderActions
                                compact
                                order={order}
                                onChange={result.refresh}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination {...result.data} onPage={(next) => change('page', String(next))} />
            </>
          )
        )}
      </section>
      <p className="catalog-note">
        Receive an ordered PO once to add all its quantities to inventory.
      </p>
    </>
  )
}
