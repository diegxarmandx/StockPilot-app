import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, PackageCheck, Pencil, X } from 'lucide-react'
import type { PurchaseOrderStatus } from '../types/api'
import { errorMessage, purchaseOrderApi } from '../services/api'
import { useNotice } from '../hooks/useNotice'
type Action = 'order' | 'cancel' | 'receive'
export function PurchaseOrderActions({
  order,
  onChange,
  compact = false,
}: {
  order: { id: number; poNumber: string; status: PurchaseOrderStatus }
  onChange: () => void
  compact?: boolean
}) {
  const [action, setAction] = useState<Action | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const notify = useNotice()
  async function confirm() {
    if (!action || busy) return
    setBusy(true)
    setError(null)
    try {
      await purchaseOrderApi.transition(order.id, action)
      notify(
        action === 'receive'
          ? 'Purchase order received. Inventory updated.'
          : action === 'order'
            ? 'Purchase order marked ordered.'
            : 'Purchase order cancelled.',
      )
      setAction(null)
      onChange()
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }
  function choose(value: Action) {
    setAction(value)
    setError(null)
  }
  if (order.status !== 'DRAFT' && order.status !== 'ORDERED') return null
  return (
    <>
      <div className={`po-actions ${compact ? 'compact' : ''}`}>
        {order.status === 'ORDERED' ? (
          <button
            className="button primary"
            aria-label="Receive purchase order"
            title="Receive purchase order"
            onClick={() => choose('receive')}
          >
            <PackageCheck size={16} />
            <span className="action-label">Receive purchase order</span>
          </button>
        ) : (
          <>
            <Link
              className="button secondary"
              aria-label="Edit"
              title="Edit draft"
              to={`/purchase-orders/${order.id}/edit`}
            >
              <Pencil size={15} />
              <span className="action-label">Edit</span>
            </Link>
            <button
              className="button primary"
              aria-label="Mark ordered"
              title="Mark ordered"
              onClick={() => choose('order')}
            >
              <Check size={16} />
              <span className="action-label">Mark ordered</span>
            </button>
            <button
              className="button ghost"
              aria-label="Cancel PO"
              title="Cancel purchase order"
              onClick={() => choose('cancel')}
            >
              <X size={16} />
              <span className="action-label">Cancel PO</span>
            </button>
          </>
        )}
      </div>
      {action && (
        <TransitionDialog
          action={action}
          number={order.poNumber}
          busy={busy}
          error={error}
          onClose={() => setAction(null)}
          onConfirm={confirm}
        />
      )}
    </>
  )
}
function TransitionDialog({
  action,
  number,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  action: Action
  number: string
  busy: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="transition-title"
      aria-describedby="transition-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <span className={`dialog-icon ${action === 'cancel' ? 'danger-icon' : ''}`}>
        {action === 'receive' ? (
          <PackageCheck size={24} />
        ) : action === 'cancel' ? (
          <X size={24} />
        ) : (
          <Check size={24} />
        )}
      </span>
      <h2 id="transition-title">
        {action === 'receive'
          ? 'Receive purchase order?'
          : action === 'order'
            ? 'Mark this PO ordered?'
            : 'Cancel this PO?'}
      </h2>
      <p id="transition-description">
        {action === 'receive' ? (
          <>
            Receiving <strong>{number}</strong> will add all ordered quantities to inventory. This
            action cannot be undone.
          </>
        ) : (
          <>
            <strong>{number}</strong> will become read-only. This status change cannot be undone.
          </>
        )}
      </p>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button autoFocus className="button secondary" disabled={busy} onClick={onClose}>
          {action === 'receive' ? 'Cancel' : 'Keep draft'}
        </button>
        <button
          className={`button ${action === 'cancel' ? 'danger' : 'primary'}`}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy
            ? 'Saving…'
            : action === 'receive'
              ? 'Receive order'
              : action === 'order'
                ? 'Confirm order'
                : 'Confirm cancellation'}
        </button>
      </div>
    </dialog>
  )
}
