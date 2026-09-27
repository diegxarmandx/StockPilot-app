import { Link } from 'react-router-dom'
import type { InventoryTransaction } from '../types/api'
import { formatDate } from '../services/format'

export function InventoryActivityTable({ entries }: { entries: InventoryTransaction[] }) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Inventory activity table">
      <table>
        <caption className="sr-only">Inventory activity</caption>
        <thead>
          <tr>
            {['Date', 'SKU', 'Product', 'Type', 'Quantity', 'Before', 'After', 'Reference'].map(
              (label) => (
                <th scope="col" key={label}>
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>
                <time dateTime={entry.createdAt} title={new Date(entry.createdAt).toLocaleString()}>
                  {formatDate(entry.createdAt)}
                </time>
              </td>
              <td className="mono">
                <Link to={`/inventory?productId=${entry.productId}`}>{entry.sku}</Link>
              </td>
              <td>
                <strong className="record-name">{entry.productName}</strong>
              </td>
              <td>
                <span className="badge badge-received">Purchase Receipt</span>
              </td>
              <td className="numeric receipt-quantity">+{entry.quantity.toLocaleString()}</td>
              <td className="numeric">{entry.balanceBefore.toLocaleString()}</td>
              <td className="numeric">{entry.balanceAfter.toLocaleString()}</td>
              <td>
                <Link
                  className="mono po-number"
                  to={`/purchase-orders?search=${encodeURIComponent(entry.referenceId)}`}
                >
                  {entry.referenceId}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
