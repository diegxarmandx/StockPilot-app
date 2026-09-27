import type { StockStatus, PurchaseOrderStatus } from '../types/api'

const labels: Record<StockStatus | PurchaseOrderStatus, string> = {
  DRAFT: 'Draft',
  ORDERED: 'Ordered',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Low stock',
  OUT_OF_STOCK: 'Out of stock',
  INACTIVE: 'Inactive',
}
export function StatusBadge({ status }: { status: StockStatus | PurchaseOrderStatus | 'ACTIVE' }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      <span className="status-dot" />
      {status === 'ACTIVE' ? 'Active' : labels[status]}
    </span>
  )
}
