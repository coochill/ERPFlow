import { AlertTriangle, Plus, X } from 'lucide-react'
import type { FormEvent } from 'react'
import type { Supplier } from '../../../types/supplier'

export type SupplierFormValues = {
  name: string
  contact_name: string
  email: string
  phone: string
  address: string
  notes: string
  status: 'active' | 'inactive'
}

type SupplierFormProps = {
  editingSupplier: Supplier | null
  form: SupplierFormValues
  saving: boolean
  error: string
  onChange: (form: SupplierFormValues) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

function SupplierForm({
  editingSupplier,
  form,
  saving,
  error,
  onChange,
  onSubmit,
  onClose,
}: SupplierFormProps) {
  const update = <K extends keyof SupplierFormValues>(
    field: K,
    value: SupplierFormValues[K],
  ) => onChange({ ...form, [field]: value })

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose()
    }}>
      <section className="item-modal supplier-form-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-modal-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">SUPPLIER MANAGEMENT</div>
            <h2 id="supplier-modal-title">{editingSupplier ? 'Edit supplier' : 'Add new supplier'}</h2>
            <p>Enter the supplier's business and contact details.</p>
          </div>
          <button type="button" className="icon-button" aria-label="Close supplier form" onClick={onClose} disabled={saving}>
            <X size={19} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="full-field">
              Supplier name <span>*</span>
              <input required maxLength={255} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. ABC Industrial Supplies" />
            </label>
            <label>
              Contact person
              <input maxLength={255} value={form.contact_name} onChange={(event) => update('contact_name', event.target.value)} placeholder="Contact person's name" />
            </label>
            <label>
              Email
              <input type="email" maxLength={255} value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="contact@example.com" />
            </label>
            <label>
              Phone
              <input maxLength={50} value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="Contact number" />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(event) => update('status', event.target.value as SupplierFormValues['status'])}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="full-field">
              Address
              <textarea rows={2} value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="Business address" />
            </label>
            <label className="full-field">
              Notes
              <textarea rows={3} value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Optional notes" />
            </label>
          </div>

          {error && <div className="form-error"><AlertTriangle size={16} /> {error}</div>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving...' : editingSupplier ? 'Save changes' : <><Plus size={16} /> Create supplier</>}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default SupplierForm
