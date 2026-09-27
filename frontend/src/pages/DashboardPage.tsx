import { ArrowRight, Package, ShoppingCart, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useResource } from '../hooks/useResource'
import type { PageResponse, Product, Vendor } from '../types/api'

export function DashboardPage() {
  const products = useResource<PageResponse<Product>>('/api/products?size=1')
  const vendors = useResource<PageResponse<Vendor>>('/api/vendors?size=1')
  return (
    <>
      <PageHeader
        eyebrow="Workspace / Overview"
        title="Operations overview"
        description="A clear starting point for your purchasing and inventory."
      />
      <div className="summary-grid">
        <Link className="summary-card" to="/products">
          <span className="summary-label">
            <Package size={19} />
            Products
            <ArrowRight size={16} />
          </span>
          <strong>
            {products.error
              ? 'Unavailable'
              : (products.data?.totalElements.toLocaleString() ?? '…')}
          </strong>
          <p>Records in your catalog</p>
        </Link>
        <Link className="summary-card" to="/vendors">
          <span className="summary-label">
            <Truck size={19} />
            Vendors
            <ArrowRight size={16} />
          </span>
          <strong>
            {vendors.error ? 'Unavailable' : (vendors.data?.totalElements.toLocaleString() ?? '…')}
          </strong>
          <p>Partners in your directory</p>
        </Link>
        <div className="summary-card muted">
          <span className="summary-label">
            <ShoppingCart size={19} />
            Purchase orders
          </span>
          <strong className="coming-soon">Coming soon</strong>
          <p>Planned for Phase 2</p>
        </div>
      </div>
      <section className="overview-panel">
        <div>
          <span className="phase-tag">YOUR OPERATIONS, ORGANIZED</span>
          <h2>
            Good operations start
            <br />
            with good records.
          </h2>
          <p>
            Build your product catalog and vendor directory.
            <br />
            Your purchasing workflow starts here.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link className="button primary" to="/products/new">
              Add a product
              <ArrowRight size={16} />
            </Link>
            <Link className="button secondary" to="/vendors/new">
              Add a vendor
            </Link>
          </div>
        </div>
        <div className="workflow-preview" aria-label="Current project phases">
          <span className="workflow-step">
            <span>01</span>
            <strong>Catalog & vendors</strong>
            <span className="badge badge-active">Available</span>
          </span>
          <span className="workflow-line" />
          <span className="workflow-step upcoming">
            <span>02</span>
            <strong>Purchase & receive</strong>
            <span className="soon-tag">Next phase</span>
          </span>
        </div>
      </section>
      <p className="catalog-note">Additional dashboard insights: Coming in the next phase.</p>
    </>
  )
}
