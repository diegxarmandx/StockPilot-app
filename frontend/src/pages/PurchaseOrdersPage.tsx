import { ShoppingCart } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'

export function PurchaseOrdersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Purchasing / Workflow"
        title="Purchase orders"
        description="The next step in your operations workflow."
      />
      <section className="placeholder-panel">
        <span className="empty-icon">
          <ShoppingCart size={30} />
        </span>
        <span className="phase-tag">PHASE 02</span>
        <h2>From order to receiving.</h2>
        <p>Purchase order workflow will be implemented in Phase 2.</p>
        <span className="text-muted">Coming in the next phase.</span>
      </section>
    </>
  )
}
