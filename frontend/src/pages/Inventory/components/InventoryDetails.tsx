import { AlertTriangle, ArrowDownToLine, ArrowUpRight, X } from 'lucide-react'
import type { FormEvent } from 'react'
import type { InventoryMovement, Item } from '../../../types/inventory'

type InventoryDetailsProps = {
  item: Item
  movementType: 'in' | 'out'
  movementQuantity: string
  movementReason: string
  movementSaving: boolean
  movementError: string
  showHistory: boolean
  historyLoading: boolean
  movements: InventoryMovement[]
  onMovementTypeChange: (type: 'in' | 'out') => void
  onQuantityChange: (value: string) => void
  onReasonChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onLoadHistory: () => void
  onShowHistoryChange: (show: boolean) => void
  onClose: () => void
}

function InventoryDetails({
  item,
  movementType,
  movementQuantity,
  movementReason,
  movementSaving,
  movementError,
  showHistory,
  historyLoading,
  movements,
  onMovementTypeChange,
  onQuantityChange,
  onReasonChange,
  onSubmit,
  onLoadHistory,
  onShowHistoryChange,
  onClose,
}: InventoryDetailsProps) {
  return (
    <div className="modal-backdrop">
      <section className="item-modal" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">INVENTORY MOVEMENT</div>
            <h2 id="stock-modal-title">{item.name}</h2>
            <p>{item.sku} · Current stock: {item.quantity} {item.unit}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close stock modal">
            <X size={19} />
          </button>
        </div>

        <div className="stock-tabs">
          <button type="button" className={movementType === 'in' ? 'stock-tab active' : 'stock-tab'} onClick={() => onMovementTypeChange('in')}>
            <ArrowDownToLine size={16} /> Receive stock
          </button>
          <button type="button" className={movementType === 'out' ? 'stock-tab active' : 'stock-tab'} onClick={() => onMovementTypeChange('out')}>
            <ArrowUpRight size={16} /> Issue stock
          </button>
        </div>

        {!showHistory ? (
          <form onSubmit={onSubmit}>
            <div className="form-grid">
              <label className="full-field">
                Quantity <span>*</span>
                <input required type="number" min="1" step="1" value={movementQuantity} onChange={(event) => onQuantityChange(event.target.value)} />
              </label>
              <label className="full-field">
                Reason <span>*</span>
                <input required maxLength={255} value={movementReason} onChange={(event) => onReasonChange(event.target.value)} placeholder={movementType === 'in' ? 'e.g. Supplier delivery' : 'e.g. Order fulfillment'} />
              </label>
            </div>
            {movementError && <div className="form-error"><AlertTriangle size={16} /> {movementError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => { onShowHistoryChange(true); onLoadHistory() }}>History</button>
              <button type="submit" className="primary-button" disabled={movementSaving}>
                {movementSaving ? 'Saving...' : movementType === 'in' ? 'Receive stock' : 'Issue stock'}
              </button>
            </div>
          </form>
        ) : (
          <div className="movement-history">
            <h3>Movement history</h3>
            {historyLoading ? <p>Loading movements...</p> : movements.length === 0 ? <p>No movements recorded yet.</p> : (
              <div className="movement-list">
                {movements.map((movement) => (
                  <div className="movement-row" key={movement.id}>
                    <div>
                      <strong>{movement.reason}</strong>
                      <small>{new Date(movement.created_at).toLocaleString()}</small>
                    </div>
                    <strong className={movement.type === 'in' ? 'movement-in' : 'movement-out'}>
                      {movement.type === 'in' ? '+' : '−'}{movement.quantity}
                    </strong>
                  </div>
                ))}
              </div>
            )}
            {movementError && <div className="form-error"><AlertTriangle size={16} /> {movementError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => onShowHistoryChange(false)}>Back</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default InventoryDetails
