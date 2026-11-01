import { AlertTriangle, Plus, X } from 'lucide-react'
import type { FormEvent } from 'react'
import type { Item } from '../../../types/inventory'

export type InventoryFormValues = {
  sku: string
  name: string
  description: string
  quantity: string
  reorder_level: string
  unit_price: string
  unit: string
}

type InventoryFormProps = {
  editingItem: Item | null
  form: InventoryFormValues
  saving: boolean
  error: string
  onChange: (form: InventoryFormValues) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

function InventoryForm({
  editingItem,
  form,
  saving,
  error,
  onChange,
  onSubmit,
  onClose,
}: InventoryFormProps) {
  const update = (field: keyof InventoryFormValues, value: string) => {
    onChange({ ...form, [field]: value })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="item-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">INVENTORY</div>
            <h2 id="modal-title">{editingItem ? 'Edit item' : 'Add new item'}</h2>
            <p>{editingItem ? 'Update the details for this inventory item.' : 'Enter the details for this inventory item.'}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close form">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              SKU <span>*</span>
              <input required maxLength={50} value={form.sku} onChange={(event) => update('sku', event.target.value)} placeholder="e.g. ITM-001" />
            </label>
            <label>
              Item name <span>*</span>
              <input required maxLength={255} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Wireless Mouse" />
            </label>
            <label className="full-field">
              Description
              <textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Optional item details" rows={3} />
            </label>
            <label>
              Quantity <span>*</span>
              <input required type="number" min="0" step="1" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} />
            </label>
            <label>
              Reorder level <span>*</span>
              <input required type="number" min="0" step="1" value={form.reorder_level} onChange={(event) => update('reorder_level', event.target.value)} />
            </label>
            <label>
              Unit price (PHP) <span>*</span>
              <input required type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => update('unit_price', event.target.value)} />
            </label>
            <label>
              Unit <span>*</span>
              <select value={form.unit} onChange={(event) => update('unit', event.target.value)}>
                <option value="piece">Piece</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
                <option value="kg">Kilogram</option>
                <option value="liter">Liter</option>
                <option value="set">Set</option>
              </select>
            </label>
          </div>

          {error && <div className="form-error"><AlertTriangle size={16} /> {error}</div>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Save changes' : <><Plus size={16} /> Create item</>}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default InventoryForm
