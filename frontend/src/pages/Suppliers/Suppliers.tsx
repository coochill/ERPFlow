import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import '../../styles/global.css'
import './Suppliers.css'
import {
  createSupplier,
  deleteSupplier as deleteSupplierRequest,
  listSuppliers,
  updateSupplier,
} from '../../services/supplierService'
import type { PaginatedSuppliers, Supplier } from '../../types/supplier'
import SupplierForm, { type SupplierFormValues } from './components/SupplierForm'
import SupplierTable from './components/SupplierTable'

const emptySupplierForm: SupplierFormValues = {
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  status: 'active',
}

type SuppliersProps = {
  onTotalChange?: (total: number) => void
}

function SuppliersPage({ onTotalChange }: SuppliersProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierPage, setSupplierPage] = useState(1)
  const [supplierLastPage, setSupplierLastPage] = useState(1)
  const [supplierTotal, setSupplierTotal] = useState(0)
  const [supplierLoading, setSupplierLoading] = useState(false)
  const [supplierError, setSupplierError] = useState('')
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState<SupplierFormValues>(emptySupplierForm)
  const [supplierFormError, setSupplierFormError] = useState('')
  const [supplierSaving, setSupplierSaving] = useState(false)

  async function loadSuppliers(pageNumber = supplierPage, showLoading = true) {
    if (showLoading) setSupplierLoading(true)
    setSupplierError('')

    try {
      const response = await listSuppliers(pageNumber)
      if (!response.ok) throw new Error('Unable to load suppliers.')

      const result: PaginatedSuppliers = await response.json()
      setSuppliers(result.data)
      setSupplierPage(result.current_page)
      setSupplierLastPage(result.last_page)
      setSupplierTotal(result.total)
    } catch (err) {
      setSupplierError(err instanceof Error ? err.message : 'Unable to load suppliers.')
    } finally {
      setSupplierLoading(false)
    }
  }

  const filteredSuppliers = useMemo(() => {
    const term = supplierSearch.trim().toLowerCase()
    if (!term) return suppliers

    return suppliers.filter((supplier) =>
      [
        supplier.name,
        supplier.contact_name ?? '',
        supplier.email ?? '',
        supplier.phone ?? '',
        supplier.address ?? '',
      ].some((value) => value.toLowerCase().includes(term)),
    )
  }, [supplierSearch, suppliers])

  async function saveSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSupplierSaving(true)
    setSupplierFormError('')

    try {
      const isEditing = editingSupplier !== null
      const response = await (isEditing
        ? updateSupplier(editingSupplier.id, supplierForm)
        : createSupplier(supplierForm))
      const result = await response.json()

      if (!response.ok) {
        const messages = result.errors
          ? Object.values(result.errors).flat().join(' ')
          : result.message ?? 'Unable to save supplier.'
        throw new Error(String(messages))
      }

      closeForm()
      await loadSuppliers(isEditing ? supplierPage : 1, false)
    } catch (err) {
      setSupplierFormError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSupplierSaving(false)
    }
  }

  async function deleteSupplier(supplier: Supplier) {
    if (!window.confirm(`Are you sure you want to delete "${supplier.name}"?`)) return

    setSupplierError('')

    try {
      const response = await deleteSupplierRequest(supplier.id)
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.message ?? 'Unable to delete supplier.')
      }

      const nextPage = suppliers.length === 1 && supplierPage > 1
        ? supplierPage - 1
        : supplierPage
      await loadSuppliers(nextPage, false)
    } catch (err) {
      setSupplierError(err instanceof Error ? err.message : 'Failed to delete supplier.')
    }
  }

  function closeForm() {
    setShowSupplierForm(false)
    setEditingSupplier(null)
    setSupplierForm(emptySupplierForm)
    setSupplierFormError('')
  }

  function editSupplier(supplier: Supplier) {
    setEditingSupplier(supplier)
    setSupplierForm({
      name: supplier.name,
      contact_name: supplier.contact_name ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
      notes: supplier.notes ?? '',
      status: supplier.status,
    })
    setSupplierFormError('')
    setShowSupplierForm(true)
  }

  useEffect(() => { void loadSuppliers(1) }, [])
  useEffect(() => { onTotalChange?.(supplierTotal) }, [onTotalChange, supplierTotal])

  return (
    <section className="suppliers-page" id="suppliers">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SUPPLIER MANAGEMENT</div>
          <h1>Suppliers</h1>
          <p>Manage supplier contacts and their current status.</p>
        </div>
        <button className="primary-button" onClick={() => { setEditingSupplier(null); setSupplierForm(emptySupplierForm); setSupplierFormError(''); setShowSupplierForm(true) }}>
          <Plus size={17} /> Add supplier
        </button>
      </div>

      {supplierError && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{supplierError}</span>
          <button onClick={() => void loadSuppliers(supplierPage)}>Retry</button>
        </div>
      )}

      <SupplierTable
        suppliers={filteredSuppliers}
        loading={supplierLoading}
        search={supplierSearch}
        total={supplierTotal}
        page={supplierPage}
        lastPage={supplierLastPage}
        onSearchChange={setSupplierSearch}
        onRefresh={() => void loadSuppliers(supplierPage)}
        onPageChange={(nextPage) => void loadSuppliers(nextPage)}
        onEdit={editSupplier}
        onDelete={(supplier) => void deleteSupplier(supplier)}
      />

      {showSupplierForm && (
        <SupplierForm
          editingSupplier={editingSupplier}
          form={supplierForm}
          saving={supplierSaving}
          error={supplierFormError}
          onChange={setSupplierForm}
          onSubmit={saveSupplier}
          onClose={closeForm}
        />
      )}
    </section>
  )
}

export default SuppliersPage
