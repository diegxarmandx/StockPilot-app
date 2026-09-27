import {
  ArrowUpRight,
  Package,
  ClipboardList,
  Banknote,
  TriangleAlert,
  ArrowDownLeft,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useResource } from '../hooks/useResource'
import { formatDate, formatMoney } from '../services/format'
import type { Dashboard, PageResponse, PurchaseOrderSummary } from '../types/api'

export function DashboardPage() {
  const result = useResource<Dashboard>('/api/dashboard')
  const orders = useResource<PageResponse<PurchaseOrderSummary>>('/api/purchase-orders?size=5')
  const data = result.data
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of purchasing and inventory activity."
        action={
          <Link className="button primary" to="/purchase-orders/new">
            <ClipboardList size={17} />
            New purchase order
          </Link>
        }
      />
      {result.loading ? (
        <LoadingState />
      ) : result.error ? (
        <ErrorState
          title="Unable to load your overview."
          message={result.error}
          retry={result.refresh}
        />
      ) : (
        data && (
          <div className="summary-grid">
            <div className="summary-card">
              <span className="summary-label">
                <span>Inventory Value</span>
                <Banknote size={19} />
              </span>
              <strong className="inventory-value">{formatMoney(data.inventoryValue)}</strong>
              <p>Current stock value</p>
            </div>
            <Link className="summary-card" to="/products">
              <span className="summary-label">
                <span>Products</span>
                <Package size={19} />
              </span>
              <strong>{data.products.toLocaleString()}</strong>
              <p>
                Catalog records <ArrowUpRight size={14} />
              </p>
            </Link>
            <Link className="summary-card" to="/purchase-orders">
              <span className="summary-label">
                <span>Open Purchase Orders</span>
                <ClipboardList size={19} />
              </span>
              <strong>{data.openPurchaseOrders.toLocaleString()}</strong>
              <p>
                Draft or ordered <ArrowUpRight size={14} />
              </p>
            </Link>
            <Link
              className={`summary-card ${data.lowStockItems ? 'attention-card' : ''}`}
              to="/products?active=true"
            >
              <span className="summary-label">
                <span>Low Stock Items</span>
                <TriangleAlert size={19} />
              </span>
              <strong>{data.lowStockItems.toLocaleString()}</strong>
              <p>
                At or below reorder point <ArrowUpRight size={14} />
              </p>
            </Link>
          </div>
        )
      )}
      <div className="dashboard-layout">
        <section className="catalog-panel dashboard-orders" aria-label="Recent purchase orders">
          <div className="panel-heading">
            <h2>Recent Purchase Orders</h2>
            <Link className="panel-caption" to="/purchase-orders">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          {orders.loading ? (
            <LoadingState />
          ) : orders.error ? (
            <ErrorState
              title="Unable to load purchase orders."
              message={orders.error}
              retry={orders.refresh}
            />
          ) : (
            orders.data &&
            (orders.data.content.length ? (
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Recent purchase orders table"
              >
                <table>
                  <caption className="sr-only">Recent purchase orders</caption>
                  <thead>
                    <tr>
                      {['PO', 'Vendor', 'Status', 'Total', 'Updated'].map((label) => (
                        <th scope="col" key={label}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.data.content.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <Link className="po-number mono" to={`/purchase-orders/${order.id}`}>
                            {order.poNumber}
                          </Link>
                        </td>
                        <td className="wrap-cell">{order.vendor.name}</td>
                        <td>
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="numeric">{formatMoney(order.total)}</td>
                        <td className="date-cell">{formatDate(order.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No purchase orders yet"
                description="Create a purchase order to begin tracking procurement."
                action={
                  <Link className="button secondary" to="/purchase-orders/new">
                    New purchase order
                  </Link>
                }
              />
            ))
          )}
        </section>
        <section
          className="catalog-panel dashboard-activity"
          aria-label="Recent inventory activity"
        >
          <div className="panel-heading">
            <h2>Recent Inventory Activity</h2>
            <Link className="panel-caption" to="/inventory">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          {result.loading ? (
            <LoadingState />
          ) : result.error ? (
            <ErrorState
              title="Unable to load inventory activity."
              message={result.error}
              retry={result.refresh}
            />
          ) : (
            data &&
            (data.recentInventoryActivity.length ? (
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Recent inventory activity table"
              >
                <table>
                  <caption className="sr-only">Recent inventory activity</caption>
                  <thead>
                    <tr>
                      {['Product', 'Movement', 'Reference', 'Date'].map((label) => (
                        <th scope="col" key={label}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentInventoryActivity.map((entry) => (
                      <tr key={entry.id}>
                        <td className="wrap-cell">
                          <Link
                            className="record-name"
                            to={`/inventory?productId=${entry.productId}`}
                          >
                            {entry.productName}
                          </Link>
                          <span className="record-description mono">{entry.sku}</span>
                        </td>
                        <td>
                          <span className="movement">
                            <ArrowDownLeft size={14} aria-hidden="true" />+
                            {entry.quantity.toLocaleString()}
                          </span>
                          <span className="record-description">Purchase Receipt</span>
                        </td>
                        <td>
                          <Link
                            className="po-number mono"
                            to={`/purchase-orders?search=${encodeURIComponent(entry.referenceId)}`}
                          >
                            {entry.referenceId}
                          </Link>
                        </td>
                        <td className="date-cell">{formatDate(entry.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No inventory activity yet"
                description="Inventory movements will appear after purchase orders are received."
              />
            ))
          )}
        </section>
      </div>
      <p className="catalog-note">
        Inventory value uses current unit costs. Low stock includes active products with no stock on
        hand.
      </p>
    </>
  )
}
