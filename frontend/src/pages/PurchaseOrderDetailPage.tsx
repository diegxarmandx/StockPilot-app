import { CheckCircle2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { PurchaseOrder } from '../types/api'
import { useResource } from '../hooks/useResource'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { ErrorState, LoadingState } from '../components/States'
import { PurchaseOrderActions } from '../components/PurchaseOrderActions'
import { formatDate, formatMoney } from '../services/format'

export function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const result = useResource<PurchaseOrder>(`/api/purchase-orders/${id}`)
  const order = result.data
  return (
    <>
      <Link className="back-link" to="/purchase-orders">
        ← Back to purchase orders
      </Link>
      {result.loading ? (
        <LoadingState />
      ) : result.error ? (
        <ErrorState message={result.error} retry={result.refresh} />
      ) : (
        order && (
          <>
            <PageHeader
              title={order.poNumber}
              description={order.vendor.name}
              badge={<StatusBadge status={order.status} />}
              action={<PurchaseOrderActions order={order} onChange={result.refresh} />}
            />
            <section className="catalog-panel">
              <dl className="po-metadata">
                <div>
                  <dt>Vendor</dt>
                  <dd>{order.vendor.name}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDate(order.createdAt)}</dd>
                </div>
                <div>
                  <dt>Ordered</dt>
                  <dd>{order.orderedAt ? formatDate(order.orderedAt) : '—'}</dd>
                </div>
                <div>
                  <dt>Received</dt>
                  <dd>{order.receivedAt ? formatDate(order.receivedAt) : '—'}</dd>
                </div>
              </dl>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Order items table"
              >
                <table>
                  <caption className="sr-only">Purchase order items</caption>
                  <thead>
                    <tr>
                      {['SKU', 'Product', 'Qty', 'Unit Cost', 'Line Total'].map((label) => (
                        <th scope="col" key={label}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="mono">{item.sku}</td>
                        <td>
                          <strong className="record-name">{item.productName}</strong>
                        </td>
                        <td>{item.quantity.toLocaleString()}</td>
                        <td className="mono">{formatMoney(item.unitCost)}</td>
                        <td className="mono">{formatMoney(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="po-totals">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(order.subtotal)}</dd>
                </div>
                <div>
                  <dt>Total · USD</dt>
                  <dd>{formatMoney(order.total)}</dd>
                </div>
              </dl>
            </section>
            {order.status === 'RECEIVED' ? (
              <div className="receipt-callout">
                <CheckCircle2 size={20} aria-hidden="true" />
                <div>
                  <strong>Inventory updated on receipt.</strong>
                  <p>This purchase order is read-only.</p>
                </div>
                <Link to={`/inventory?referenceId=${encodeURIComponent(order.poNumber)}`}>
                  View receipt activity →
                </Link>
              </div>
            ) : (
              <p className="catalog-note">
                {order.status === 'DRAFT'
                  ? 'Review your items and totals before marking this order as ordered.'
                  : 'This purchase order is read-only.'}
              </p>
            )}
          </>
        )
      )}
    </>
  )
}
