import type { StockStatus } from '../types/api'

const labels: Record<StockStatus, string> = {
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Low stock',
  OUT_OF_STOCK: 'Out of stock',
  INACTIVE: 'Inactive',
}
export function StatusBadge({ status }: { status: StockStatus | 'ACTIVE' }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      <span className="status-dot" />
      {status === 'ACTIVE' ? 'Active' : labels[status]}
    </span>
  )
}
