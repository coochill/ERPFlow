import { AlertTriangle, Plus, Trash2, X } from 'lucide-react'
import type { FormEvent } from 'react'
import type { Item } from '../../../types/inventory'
import type { PurchaseRequest, PurchaseRequestFormItem } from '../../../types/purchaseRequest'
import type { Supplier } from '../../../types/supplier'

type PurchaseRequestFormProps = {
  editingRequest: PurchaseRequest | null
  suppliers: Supplier[]
  items: Item[]
  supplierId: string
  notes: string
  requestItems: PurchaseRequestFormItem[]
  saving: boolean
  error: string
  currency: (value: number) => string
  onSupplierChange: (value: string) => void
  onNotesChange: (value: string) => void
  onItemsChange: (items: PurchaseRequestFormItem[]) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

function PurchaseRequestForm({
  editingRequest,
  suppliers,
  items,
  supplierId,
  notes,
  requestItems,
  saving,
  error,
  currency,
  onSupplierChange,
  onNotesChange,
  onItemsChange,
  onSubmit,
  onClose,
}: PurchaseRequestFormProps) {
  const updateLine = (index: number, patch: Partial<PurchaseRequestFormItem>) => {
    onItemsChange(requestItems.map((line, lineIndex) => (
      lineIndex === index ? { ...line, ...patch } : line
    )))
  }

  const total = requestItems.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0),
    0,
  )

  return (
    <div className="modal-backdrop">
      <section className="item-modal purchase-request-form-modal" role="dialog" aria-modal="true" aria-labelledby="purchase-modal-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">PROCUREMENT</div>
            <h2 id="purchase-modal-title">{editingRequest ? 'Edit purchase request' : 'New purchase request'}</h2>
            <p>Choose a supplier and the items you want to order.</p>
          </div>
          <button type="button" className="icon-button" aria-label="Close purchase request form" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="full-field">
              Supplier <span>*</span>
              <select required value={supplierId} onChange={(event) => onSupplierChange(event.target.value)}>
                <option value="">Select a supplier</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </label>
            <label className="full-field">
              Notes
              <textarea rows={3} value={notes} onChange={(event) => onNotesChange(event.target.value)} placeholder="Optional purchasing notes" />
            </label>
          </div>

          <div className="form-section-heading">
            <h3>Requested items</h3>
            <button type="button" className="secondary-button" onClick={() => onItemsChange([...requestItems, { item_id: '', quantity: '1', unit_price: '0' }])}>
              <Plus size={16} /> Add item
            </button>
          </div>

          {requestItems.map((line, index) => (
            <div className="form-grid line-grid" key={index}>
              <label>
                Inventory item <span>*</span>
                <select
                  required
                  value={line.item_id}
                  onChange={(event) => {
                    const itemId = event.target.value
                    const selected = items.find((item) => String(item.id) === itemId)
                    updateLine(index, {
                      item_id: itemId,
                      unit_price: selected ? String(selected.unit_price ?? 0) : line.unit_price,
                    })
                  }}
                >
                  <option value="">Select an item</option>
                  {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                Quantity <span>*</span>
                <input type="number" min="1" step="1" required value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
              </label>
              <label>
                Unit price <span>*</span>
                <input type="number" min="0" step="0.01" required value={line.unit_price} onChange={(event) => updateLine(index, { unit_price: event.target.value })} />
              </label>
              <button type="button" className="delete-button" aria-label={`Remove item ${index + 1}`} disabled={requestItems.length === 1} onClick={() => onItemsChange(requestItems.filter((_, lineIndex) => lineIndex !== index))}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {error && <div className="form-error"><AlertTriangle size={16} /> {error}</div>}

          <div className="modal-actions">
            <span className="estimated-total">Estimated total <strong>{currency(total)}</strong></span>
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving...' : editingRequest ? 'Save changes' : 'Create request'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default PurchaseRequestForm
