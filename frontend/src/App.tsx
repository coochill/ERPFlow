import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Package,
  Plus,
  Search,
  Trash2,
  Settings,
  ShoppingCart,
  Truck,
  X,
} from 'lucide-react'
import './App.css'

type Item = {
  id: number
  sku: string
  name: string
  description: string | null
  quantity: number
  reorder_level: number
  unit_price: string
  unit: string
}

type PaginatedItems = {
  data: Item[]
  current_page: number
  last_page: number
  total: number
}

type InventoryMovement = {
  id: number
  item_id: number
  type: 'in' | 'out'
  quantity: number
  reason: string
  created_at: string
}

type PaginatedMovements = {
  data: InventoryMovement[]
  current_page: number
  last_page: number
  total: number
}

const emptyForm = {
  sku: '',
  name: '',
  description: '',
  quantity: '0',
  reorder_level: '10',
  unit_price: '0',
  unit: 'piece',
}

function App() {
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
  const [form, setForm] = useState(emptyForm)
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

  async function loadItems(pageNumber = page) {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `/api/items?page=${pageNumber}`,
        { headers: { Accept: 'application/json' } },
      )

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

  useEffect(() => {
    void loadItems(1)
  }, [])

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
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          reorder_level: Number(form.reorder_level),
          unit_price: Number(form.unit_price),
        }),
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
      await loadItems(1)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Something went wrong.',
      )
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
      const response = await fetch(`/api/items/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          reorder_level: Number(form.reorder_level),
          unit_price: Number(form.unit_price),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        const messages = result.errors
          ? Object.values(result.errors).flat().join(' ')
          : result.message ?? 'Unable to update item.'

        throw new Error(String(messages))
      }

      setShowForm(false)
      setEditingItem(null)
      setForm(emptyForm)
      await loadItems(page)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Something went wrong.',
      )
    } finally {
      setSaving(false)
    }
  }
  async function deleteItem(item: Item) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}" (${item.sku})?`,
    )

    if (!confirmed) return

    setError('')

    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Unable to delete item.')
      }

      // Reload the current page, or the previous page if it became empty.
      const nextPage = items.length === 1 && page > 1 ? page - 1 : page
      await loadItems(nextPage)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete item.',
      )
    }
  }
  
  async function recordMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedItem) return

    setMovementSaving(true)
    setMovementError('')

    try {
      const response = await fetch(
        `/api/items/${selectedItem.id}/movements`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            type: movementType,
            quantity: Number(movementQuantity),
            reason: movementReason,
          }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        const messages = result.errors
          ? Object.values(result.errors).flat().join(' ')
          : result.message ?? 'Unable to record stock movement.'

        throw new Error(String(messages))
      }
      if (result.item) {
        setSelectedItem(result.item as Item)
      }

      setMovementQuantity('1')
      setMovementReason('')
      setMovementError('')

      await loadItems(page)
      await loadMovementHistory(selectedItem.id)
    } catch (err) {
      setMovementError(
        err instanceof Error ? err.message : 'Something went wrong.',
      )
    } finally {
      setMovementSaving(false)
    }
  }

  async function loadMovementHistory(itemId: number) {
    setHistoryLoading(true)
    setMovementError('')

    try {
      const response = await fetch(
        `/api/items/${itemId}/movements`,
        { headers: { Accept: 'application/json' } },
      )

      if (!response.ok) {
        throw new Error('Unable to load movement history.')
      }

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

  const currency = (value: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 2,
    }).format(value)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-mark"><Boxes size={23} /></span>
          <span>ERP<span className="brand-light">Flow</span></span>
        </a>

        <div className="nav-label">WORKSPACE</div>
        <nav className="nav-list">
          <a className="nav-link" href="#overview">
            <LayoutDashboard size={18} /> Overview
          </a>
          <a className="nav-link active" href="#inventory">
            <Package size={18} /> Inventory
            <span className="nav-count">{total}</span>
          </a>
          <a className="nav-link" href="#suppliers">
            <Truck size={18} /> Suppliers
          </a>
          <a className="nav-link" href="#purchases">
            <ShoppingCart size={18} /> Purchase requests
          </a>
        </nav>

        <div className="sidebar-bottom">
          <a className="nav-link" href="#activity">
            <Activity size={18} /> Activity
          </a>
          <a className="nav-link" href="#settings">
            <Settings size={18} /> Settings
          </a>
          <div className="workspace-card">
            <span className="workspace-dot" />
            <div>
              <strong>Development</strong>
              <small>Local environment</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Inventory</div>
          <div className="topbar-right">
            <span className="status-dot" /> API connected
            <div className="avatar">JD</div>
          </div>
        </header>

        <section className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">INVENTORY MANAGEMENT</div>
              <h1>Inventory</h1>
              <p>Track stock levels, item details, and inventory value.</p>
            </div>
            <button className="primary-button" onClick={() => {
              setForm(emptyForm)
              setFormError('')
              setShowForm(true)
            }}>
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
              <div className="stat-top">
                <span>Total items</span>
                <span className="stat-icon blue"><Package size={19} /></span>
              </div>
              <div className="stat-number">{loading ? '—' : total}</div>
              <div className="stat-foot">Registered inventory items</div>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span>Low stock</span>
                <span className="stat-icon amber"><AlertTriangle size={19} /></span>
              </div>
              <div className="stat-number">{loading ? '—' : lowStock}</div>
              <div className="stat-foot">At or below reorder level</div>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span>Units in stock</span>
                <span className="stat-icon green"><Boxes size={19} /></span>
              </div>
              <div className="stat-number">
                {loading ? '—' : items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
              </div>
              <div className="stat-foot">Across the current page</div>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span>Stock value</span>
                <span className="stat-icon violet"><ArrowUpRight size={19} /></span>
              </div>
              <div className="stat-number stat-currency">
                {loading ? '—' : currency(inventoryValue)}
              </div>
              <div className="stat-foot">Estimated value of current page</div>
            </article>
          </div>

          <section className="inventory-panel" id="inventory">
            <div className="panel-heading">
              <div>
                <h2>All inventory</h2>
                <p>Manage and monitor your stocked items.</p>
              </div>
              <button className="secondary-button" onClick={() => void loadItems(page)}>
                <ArrowDownToLine size={16} /> Refresh
              </button>
            </div>

            <div className="table-toolbar">
              <label className="search-box">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, SKU, or description..."
                />
                {search && (
                  <button aria-label="Clear search" onClick={() => setSearch('')}>
                    <X size={15} />
                  </button>
                )}
              </label>
              <span className="result-count">{total} records</span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>SKU</th>
                    <th>STOCK LEVEL</th>
                    <th>UNIT PRICE</th>
                    <th>STOCK STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="empty-state">Loading inventory...</td></tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-state">
                        <span className="empty-icon"><Package size={25} /></span>
                        <strong>{search ? 'No matching items' : 'No inventory yet'}</strong>
                        <span>{search ? 'Try another search term.' : 'Add your first item to start tracking stock.'}</span>
                        {!search && (
                          <button className="primary-button small-button" onClick={() => setShowForm(true)}>
                            <Plus size={16} /> Add your first item
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : filteredItems.map((item) => {
                    const isLow = item.quantity <= item.reorder_level

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="item-cell">
                            <span className="item-avatar"><Package size={17} /></span>
                            <span>
                              <strong>{item.name}</strong>
                              <small>{item.description || 'No description'}</small>
                            </span>
                          </div>
                        </td>
                        <td><span className="sku">{item.sku}</span></td>
                        <td>
                          <strong>{item.quantity.toLocaleString()}</strong>
                          <span className="unit-label"> {item.unit}</span>
                          <div className="stock-sub">Reorder at {item.reorder_level}</div>
                        </td>
                        <td className="price-cell">{currency(Number(item.unit_price))}</td>
                        <td>
                          <span className={`stock-badge ${isLow ? 'low' : 'healthy'}`}>
                            <span /> {isLow ? 'Low stock' : 'In stock'}
                          </span>
                        </td>
                        <td>
                        <div className="row-actions">
                                                    <button
                          type="button"
                          className="edit-button"
                          onClick={() => {
                            setSelectedItem(item)
                            setMovementType('in')
                            setMovementQuantity('1')
                            setMovementReason('')
                            setMovementError('')
                            setShowHistory(false)
                            setMovements([])
                          }}
                        >
                          Stock
                        </button>
                          <button
                            type="button"
                            className="edit-button"
                            onClick={() => {
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
                            aria-label={`Edit ${item.name}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => void deleteItem(item)}
                            title={`Delete ${item.name}`}
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>Page {page} of {lastPage}</span>
              <div className="pagination">
                <button disabled={page <= 1 || loading} onClick={() => void loadItems(page - 1)} aria-label="Previous page">
                  <ChevronLeft size={17} />
                </button>
                <span>{page}</span>
                <button disabled={page >= lastPage || loading} onClick={() => void loadItems(page + 1)} aria-label="Next page">
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </section>
          <footer className="page-footer">ERPFlow <span>·</span> Inventory management <span>·</span> Development build</footer>
        </section>
      </main>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowForm(false)
              setEditingItem(null)
              setForm(emptyForm)
              setFormError('')
            }
          }}>
          <section className="item-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">INVENTORY</div>
                <h2 id="modal-title">
                  {editingItem ? 'Edit item' : 'Add new item'}
                </h2>
                <p>
                  {editingItem
                    ? 'Update the details for this inventory item.'
                    : 'Enter the details for this inventory item.'}
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setShowForm(false)
                  setEditingItem(null)
                  setForm(emptyForm)
                  setFormError('')
                }}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={editingItem ? updateItem : createItem}>
              <div className="form-grid">
                <label>
                  SKU <span>*</span>
                  <input required maxLength={50} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. ITM-001" />
                </label>
                <label>
                  Item name <span>*</span>
                  <input required maxLength={255} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wireless Mouse" />
                </label>
                <label className="full-field">
                  Description
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional item details" rows={3} />
                </label>
                <label>
                  Quantity <span>*</span>
                  <input required type="number" min="0" step="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </label>
                <label>
                  Reorder level <span>*</span>
                  <input required type="number" min="0" step="1" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
                </label>
                <label>
                  Unit price (PHP) <span>*</span>
                  <input required type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
                </label>
                <label>
                  Unit <span>*</span>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    <option value="piece">Piece</option>
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                    <option value="kg">Kilogram</option>
                    <option value="liter">Liter</option>
                    <option value="set">Set</option>
                  </select>
                </label>
              </div>

              {formError && <div className="form-error"><AlertTriangle size={16} /> {formError}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingItem(null)
                    setForm(emptyForm)
                    setFormError('')
                  }}
                >
                  Cancel
                </button> 
                  <button type="submit" className="primary-button" disabled={saving}>
                  {saving
                    ? 'Saving...'
                    : editingItem
                      ? 'Save changes'
                      : <><Plus size={16} /> Create item</>}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    {selectedItem && (
      <div className="modal-backdrop">
        <section
          className="item-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-modal-title"
        >
          <div className="modal-heading">
            <div>
              <div className="eyebrow">INVENTORY MOVEMENT</div>
              <h2 id="stock-modal-title">{selectedItem.name}</h2>
              <p>
                {selectedItem.sku} · Current stock: {selectedItem.quantity} {selectedItem.unit}
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => {
                setSelectedItem(null)
                setShowHistory(false)
                setMovementError('')
              }}
              aria-label="Close stock modal"
            >
              <X size={19} />
            </button>
          </div>

          <div className="stock-tabs">
            <button
              type="button"
              className={movementType === 'in' ? 'stock-tab active' : 'stock-tab'}
              onClick={() => setMovementType('in')}
            >
              <ArrowDownToLine size={16} /> Receive stock
            </button>
            <button
              type="button"
              className={movementType === 'out' ? 'stock-tab active' : 'stock-tab'}
              onClick={() => setMovementType('out')}
            >
              <ArrowUpRight size={16} /> Issue stock
            </button>
          </div>

          {!showHistory ? (
            <form onSubmit={recordMovement}>
              <div className="form-grid">
                <label className="full-field">
                  Quantity <span>*</span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={movementQuantity}
                    onChange={(event) => setMovementQuantity(event.target.value)}
                  />
                </label>

                <label className="full-field">
                  Reason <span>*</span>
                  <input
                    required
                    maxLength={255}
                    value={movementReason}
                    onChange={(event) => setMovementReason(event.target.value)}
                    placeholder={
                      movementType === 'in'
                        ? 'e.g. Supplier delivery'
                        : 'e.g. Order fulfillment'
                    }
                  />
                </label>
              </div>

              {movementError && (
                <div className="form-error">
                  <AlertTriangle size={16} /> {movementError}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowHistory(true)
                    void loadMovementHistory(selectedItem.id)
                  }}
                >
                  History
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={movementSaving}
                >
                  {movementSaving
                    ? 'Saving...'
                    : movementType === 'in'
                      ? 'Receive stock'
                      : 'Issue stock'}
                </button>
              </div>
            </form>
          ) : (
            <div className="movement-history">
              <h3>Movement history</h3>

              {historyLoading ? (
                <p>Loading movements...</p>
              ) : movements.length === 0 ? (
                <p>No movements recorded yet.</p>
              ) : (
                <div className="movement-list">
                  {movements.map((movement) => (
                    <div className="movement-row" key={movement.id}>
                      <div>
                        <strong>{movement.reason}</strong>
                        <small>
                          {new Date(movement.created_at).toLocaleString()}
                        </small>
                      </div>
                      <strong className={movement.type === 'in' ? 'movement-in' : 'movement-out'}>
                        {movement.type === 'in' ? '+' : '−'}
                        {movement.quantity}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              {movementError && (
                <div className="form-error">
                  <AlertTriangle size={16} /> {movementError}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowHistory(false)}
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    )}
  
    </div>
  )
}

export default App
