import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Pencil, Plus } from 'lucide-react'
import type { Vendor } from '../types/api'
import { vendorApi, errorMessage } from '../services/api'
import { useCatalog } from '../hooks/useCatalog'
import { useNotice } from '../hooks/useNotice'
import { PageHeader } from '../components/PageHeader'
import { CatalogToolbar } from '../components/CatalogToolbar'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import { DeactivateDialog } from '../components/DeactivateDialog'
import { EmptyState, ErrorState, LoadingState } from '../components/States'

export function VendorsPage() {
  const catalog = useCatalog<Vendor>('vendors')
  const notify = useNotice()
  const [target, setTarget] = useState<Vendor | null>(null)
  const [busy, setBusy] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  async function deactivate() {
    if (!target || busy) return
    setBusy(true)
    setMutationError(null)
    try {
      await vendorApi.deactivate(target.id)
      notify('Vendor deactivated.')
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
        eyebrow="Purchasing / Master data"
        title="Vendors"
        description="A reliable directory for the people who keep you supplied."
        action={
          <Link className="button primary" to="/vendors/new">
            <Plus size={17} />
            New vendor
          </Link>
        }
      />
      <section className="catalog-panel" aria-label="Vendor catalog">
        <div className="panel-heading">
          <h2>All vendors</h2>
          {catalog.data && <span className="count-badge">{catalog.data.totalElements}</span>}
          <span className="panel-caption">Your supply network</span>
        </div>
        <CatalogToolbar
          key={catalog.search}
          search={catalog.search}
          active={catalog.active}
          placeholder="Search by name or email…"
          onSearch={(search) => catalog.change({ search })}
          onActive={(active) => catalog.change({ active })}
          onClear={() => catalog.change({ search: '', active: '' })}
        />
        {catalog.loading ? (
          <LoadingState />
        ) : catalog.error ? (
          <ErrorState message={catalog.error} retry={catalog.refresh} />
        ) : (
          catalog.data && (
            <>
              {catalog.data.content.length === 0 ? (
                <EmptyState
                  title="No vendors found"
                  description={
                    catalog.search || catalog.active
                      ? 'Try a different search or clear your filters.'
                      : 'Create your first vendor to get started.'
                  }
                />
              ) : (
                <div className="table-scroll">
                  <table>
                    <caption className="sr-only">Vendor catalog</caption>
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Email</th>
                        <th scope="col">Phone</th>
                        <th scope="col">Status</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalog.data.content.map((record) => (
                        <tr key={record.id}>
                          <td>
                            <div className="vendor-identity">
                              <span className="vendor-avatar">
                                {record.name.slice(0, 2).toUpperCase()}
                              </span>
                              <strong className="record-name">{record.name}</strong>
                            </div>
                          </td>
                          <td>{record.email || <span className="text-muted">—</span>}</td>
                          <td className="mono">
                            {record.phone || <span className="text-muted">—</span>}
                          </td>
                          <td>
                            <StatusBadge status={record.active ? 'ACTIVE' : 'INACTIVE'} />
                          </td>
                          <td>
                            <div className="row-actions">
                              <Link
                                className="icon-button"
                                aria-label={`Edit ${record.name}`}
                                title="Edit vendor"
                                to={`/vendors/${record.id}/edit`}
                              >
                                <Pencil size={15} />
                              </Link>
                              <button
                                className="icon-button"
                                aria-label={`Deactivate ${record.name}`}
                                title={record.active ? 'Deactivate vendor' : 'Already inactive'}
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
        Inactive vendors remain in your directory for future reference.
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
