import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Boxes, Package, Plus } from 'lucide-react'
import '../../styles/global.css'
import './Inventory.css'
import {
  createItem as createInventoryItem,
  deleteItem as deleteInventoryItem,
  listItems,
  listMovements,
  recordMovement as recordInventoryMovement,
  updateItem as updateInventoryItem,
} from '../../services/inventoryService'
import type {
  InventoryMovement,
  Item,
  PaginatedItems,
  PaginatedMovements,
} from '../../types/inventory'
import InventoryDetails from './components/InventoryDetails'
import InventoryForm, { type InventoryFormValues } from './components/InventoryForm'
import InventoryTable from './components/InventoryTable'

const emptyForm: InventoryFormValues = {
  sku: '',
  name: '',
  description: '',
  quantity: '0',
  reorder_level: '10',
  unit_price: '0',
  unit: 'piece',
}

type InventoryProps = {
  onTotalChange?: (total: number) => void
  onRefreshReady?: (refresh: () => void) => void
}

function InventoryPage({ onTotalChange, onRefreshReady }: InventoryProps) {
  const [items, setItems] = useState<Item[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [form, setForm] = useState<InventoryFormValues>(emptyForm)
  const [formError, setFormError] = useState('')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [movementType, setMovementType] = useState<'in' | 'out'>('in')
  const [movementQuantity, setMovementQuantity] = useState('1')
  const [movementReason, setMovementReason] = useState('')
  const [movementSaving, setMovementSaving] = useState(false)
  const [movementError, setMovementError] = useState('')
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  async function loadItems(pageNumber = page, showLoading = true) {
    if (showLoading) setLoading(true)
    setError('')

    try {
      const response = await listItems(pageNumber)
      if (!response.ok) throw new Error('Unable to load inventory.')

      const result: PaginatedItems = await response.json()
      setItems(result.data)
      setPage(result.current_page)
      setLastPage(result.last_page)
      setTotal(result.total)
    } catch {
      setError('Could not connect to the inventory API. Check Docker and the Vite proxy.')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items

    return items.filter((item) =>
      [item.sku, item.name, item.description ?? '']
        .some((value) => value.toLowerCase().includes(term)),
    )
  }, [items, search])

  const lowStock = items.filter(
    (item) => item.quantity <= item.reorder_level,
  ).length

  const inventoryValue = items.reduce(
    (sum, item) => sum + item.quantity * Number(item.unit_price),
    0,
  )

  async function createItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFormError('')

    try {
      const response = await createInventoryItem({
        ...form,
        quantity: Number(form.quantity),
        reorder_level: Number(form.reorder_level),
        unit_price: Number(form.unit_price),
      })
      const result = await response.json()

      if (!response.ok) {
        const messages = result.errors
          ? Object.values(result.errors).flat().join(' ')
          : result.message ?? 'Unable to create item.'
        throw new Error(String(messages))
      }

      setForm(emptyForm)
      setShowForm(false)
      await loadItems(1, false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function updateItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingItem) return

    setSaving(true)
    setFormError('')

    try {
      const response = await updateInventoryItem(editingItem.id, {
        ...form,
        quantity: Number(form.quantity),
        reorder_level: Number(form.reorder_level),
        unit_price: Number(form.unit_price),
      })
      const result = await response.json()

      if (!response.ok) {
        const messages = result.errors
          ? Object.values(result.errors).flat().join(' ')
          : result.message ?? 'Unable to update item.'
        throw new Error(String(messages))
      }

      closeForm()
      await loadItems(page, false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(item: Item) {
    if (!window.confirm(`Are you sure you want to delete "${item.name}" (${item.sku})?`)) {
      return
    }

    setError('')

    try {
      const response = await deleteInventoryItem(item.id)
      if (!response.ok) throw new Error('Unable to delete item.')

      const nextPage = items.length === 1 && page > 1 ? page - 1 : page
      await loadItems(nextPage, false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item.')
    }
  }

  async function recordMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedItem) return

    setMovementSaving(true)
    setMovementError('')

    try {
      const response = await recordInventoryMovement(selectedItem.id, {
        type: movementType,
        quantity: Number(movementQuantity),
        reason: movementReason,
      })
      const result = await response.json()

      if (!response.ok) {
        const messages = result.errors
          ? Object.values(result.errors).flat().join(' ')
          : result.message ?? 'Unable to record stock movement.'
        throw new Error(String(messages))
      }

      if (result.item) setSelectedItem(result.item as Item)
      setMovementQuantity('1')
      setMovementReason('')
      await loadItems(page, false)
      await loadMovementHistory(selectedItem.id)
    } catch (err) {
      setMovementError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setMovementSaving(false)
    }
  }

  async function loadMovementHistory(itemId: number) {
    setHistoryLoading(true)
    setMovementError('')

    try {
      const response = await listMovements(itemId)
      if (!response.ok) throw new Error('Unable to load movement history.')

      const result: PaginatedMovements = await response.json()
      setMovements(result.data)
    } catch (err) {
      setMovementError(
        err instanceof Error ? err.message : 'Unable to load movement history.',
      )
    } finally {
      setHistoryLoading(false)
    }
  }

  function closeForm() {
    setShowForm(false)
    setEditingItem(null)
    setForm(emptyForm)
    setFormError('')
  }

  function openStock(item: Item) {
    setSelectedItem(item)
    setMovementType('in')
    setMovementQuantity('1')
    setMovementReason('')
    setMovementError('')
    setShowHistory(false)
    setMovements([])
  }

  const currency = (value: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 2,
    }).format(value)

  useEffect(() => { void loadItems(1) }, [])
  useEffect(() => { onTotalChange?.(total) }, [onTotalChange, total])
  useEffect(() => {
    onRefreshReady?.(() => { void loadItems(page, false) })
  }, [onRefreshReady, page])

  return (
    <section className="inventory-page" id="inventory">
      <div className="page-heading">
        <div>
          <div className="eyebrow">INVENTORY MANAGEMENT</div>
          <h1>Inventory</h1>
          <p>Track stock levels, item details, and inventory value.</p>
        </div>
        <button className="primary-button" onClick={() => { setEditingItem(null); setForm(emptyForm); setFormError(''); setShowForm(true) }}>
          <Plus size={17} /> Add item
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={() => void loadItems(page)}>Retry</button>
        </div>
      )}

      <div className="stats-grid">
        <article className="stat-card">
          <div className="stat-top"><span>Total items</span><span className="stat-icon blue"><Package size={19} /></span></div>
          <div className="stat-number">{loading ? '—' : total}</div>
          <div className="stat-foot">Registered inventory items</div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>Low stock</span><span className="stat-icon amber"><AlertTriangle size={19} /></span></div>
          <div className="stat-number">{loading ? '—' : lowStock}</div>
          <div className="stat-foot">At or below reorder level</div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>Units in stock</span><span className="stat-icon green"><Boxes size={19} /></span></div>
          <div className="stat-number">{loading ? '—' : items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}</div>
          <div className="stat-foot">Across the current page</div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>Stock value</span><span className="stat-icon violet"><ArrowUpRight size={19} /></span></div>
          <div className="stat-number stat-currency">{loading ? '—' : currency(inventoryValue)}</div>
          <div className="stat-foot">Estimated value of current page</div>
        </article>
      </div>

      <InventoryTable
        filteredItems={filteredItems}
        loading={loading}
        search={search}
        total={total}
        page={page}
        lastPage={lastPage}
        currency={currency}
        onSearchChange={setSearch}
        onRefresh={() => void loadItems(page)}
        onPageChange={(nextPage) => void loadItems(nextPage)}
        onStock={openStock}
        onEdit={(item) => {
          setEditingItem(item)
          setForm({
            sku: item.sku,
            name: item.name,
            description: item.description ?? '',
            quantity: String(item.quantity),
            reorder_level: String(item.reorder_level),
            unit_price: String(item.unit_price),
            unit: item.unit,
          })
          setFormError('')
          setShowForm(true)
        }}
        onDelete={(item) => void deleteItem(item)}
        onAddFirstItem={() => setShowForm(true)}
      />

      {showForm && (
        <InventoryForm
          editingItem={editingItem}
          form={form}
          saving={saving}
          error={formError}
          onChange={setForm}
          onSubmit={editingItem ? updateItem : createItem}
          onClose={closeForm}
        />
      )}

      {selectedItem && (
        <InventoryDetails
          item={selectedItem}
          movementType={movementType}
          movementQuantity={movementQuantity}
          movementReason={movementReason}
          movementSaving={movementSaving}
          movementError={movementError}
          showHistory={showHistory}
          historyLoading={historyLoading}
          movements={movements}
          onMovementTypeChange={setMovementType}
          onQuantityChange={setMovementQuantity}
          onReasonChange={setMovementReason}
          onSubmit={recordMovement}
          onLoadHistory={() => void loadMovementHistory(selectedItem.id)}
          onShowHistoryChange={setShowHistory}
          onClose={() => {
            setSelectedItem(null)
            setShowHistory(false)
            setMovementError('')
          }}
        />
      )}
    </section>
  )
}

export default InventoryPage
