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

type Supplier = {
  id: number
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

type PaginatedSuppliers = {
  data: Supplier[]
  current_page: number
  last_page: number
  total: number
}

type PurchaseRequestStatus = 'draft' | 'pending' | 'approved' | 'rejected'

type PurchaseRequestItem = {
  id: number
  purchase_request_id: number
  item_id: number
  quantity: number
  unit_price: string
  item: Item
}

type PurchaseRequest = {
  id: number
  request_number: string
  supplier_id: number
  status: PurchaseRequestStatus
  notes: string | null
  supplier: Supplier
  items: PurchaseRequestItem[]
  created_at: string
  updated_at: string
}

type PaginatedPurchaseRequests = {
  data: PurchaseRequest[]
  current_page: number
  last_page: number
  total: number
}

type PurchaseRequestFormItem = {
  item_id: string
  quantity: string
  unit_price: string
}

const emptyPurchaseRequestItem: PurchaseRequestFormItem = {
  item_id: '',
  quantity: '1',
  unit_price: '0',
}

const emptySupplierForm = {
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  status: 'active' as 'active' | 'inactive',
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

const purchaseStatusBadge: Record<
  PurchaseRequestStatus,
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'neutral' },
  pending: { label: 'Pending', className: 'low' },
  approved: { label: 'Approved', className: 'healthy' },
  rejected: { label: 'Rejected', className: 'danger' },
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  
  const [purchaseRequestSupplierOptions, setPurchaseRequestSupplierOptions] =
    useState<Supplier[]>([])
  const [purchaseRequestItemOptions, setPurchaseRequestItemOptions] =
    useState<Item[]>([])

  
const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([])
  const [purchaseRequestPage, setPurchaseRequestPage] = useState(1)
  const [purchaseRequestLastPage, setPurchaseRequestLastPage] = useState(1)
  const [purchaseRequestTotal, setPurchaseRequestTotal] = useState(0)
  const [purchaseRequestLoading, setPurchaseRequestLoading] = useState(false)
  const [purchaseRequestError, setPurchaseRequestError] = useState('')
  const [purchaseRequestSearch, setPurchaseRequestSearch] = useState('')
  const [purchaseRequestStatusFilter, setPurchaseRequestStatusFilter] =
    useState('all')

  const [showPurchaseRequestForm, setShowPurchaseRequestForm] = useState(false)
  const [editingPurchaseRequest, setEditingPurchaseRequest] =
    useState<PurchaseRequest | null>(null)
  const [purchaseRequestSaving, setPurchaseRequestSaving] = useState(false)
  const [purchaseRequestFormError, setPurchaseRequestFormError] = useState('')

  const [purchaseRequestSupplierId, setPurchaseRequestSupplierId] = useState('')
  const [purchaseRequestNotes, setPurchaseRequestNotes] = useState('')
  const [purchaseRequestItems, setPurchaseRequestItems] = useState<
    PurchaseRequestFormItem[]
  >([{ ...emptyPurchaseRequestItem }])

  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierPage, setSupplierPage] = useState(1)
  const [supplierLastPage, setSupplierLastPage] = useState(1)
  const [supplierTotal, setSupplierTotal] = useState(0)
  const [supplierLoading, setSupplierLoading] = useState(false)
  const [supplierError, setSupplierError] = useState('')

  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm)
  const [supplierFormError, setSupplierFormError] = useState('')
  const [supplierSaving, setSupplierSaving] = useState(false)
  

 const [activePage, setActivePage] = useState<
    'inventory' | 'suppliers' | 'purchases'
  >('inventory')

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

  const filteredPurchaseRequests = useMemo(() => {
  const term = purchaseRequestSearch.trim().toLowerCase()

  return purchaseRequests.filter(
    (request) =>
      (!term ||
        request.request_number.toLowerCase().includes(term) ||
        request.supplier.name.toLowerCase().includes(term)) &&
      (purchaseRequestStatusFilter === 'all' ||
        request.status === purchaseRequestStatusFilter),
  )
}, [purchaseRequests, purchaseRequestSearch, purchaseRequestStatusFilter])

  const filteredSuppliers = useMemo(() => {
  const term = supplierSearch.trim().toLowerCase()

    if (!term) return suppliers

    return suppliers.filter((supplier) =>
      [
        supplier.name,
        supplier.contact_name ?? '',
        supplier.email ?? '',
        supplier.phone ?? '',
      ].some((value) => value.toLowerCase().includes(term)),
    )
  }, [suppliers, supplierSearch])

  const lowStock = items.filter(
    (item) => item.quantity <= item.reorder_level,
  ).length

  const inventoryValue = items.reduce(
    (sum, item) => sum + item.quantity * Number(item.unit_price),
    0,
  )



  async function loadSuppliers(pageNumber = supplierPage) {
  setSupplierLoading(true)
  setSupplierError('')

  try {
    const response = await fetch(
      `/api/suppliers?page=${pageNumber}`,
      { headers: { Accept: 'application/json' } },
    )

    if (!response.ok) {
      throw new Error('Unable to load suppliers.')
    }

    const result: PaginatedSuppliers = await response.json()

    setSuppliers(result.data)
    setSupplierPage(result.current_page)
    setSupplierLastPage(result.last_page)
    setSupplierTotal(result.total)
  } catch (err) {
    setSupplierError(
      err instanceof Error ? err.message : 'Unable to load suppliers.',
    )
  } finally {
    setSupplierLoading(false)
  }
}


async function loadPurchaseRequests(pageNumber = purchaseRequestPage) {
  setPurchaseRequestLoading(true)
  setPurchaseRequestError('')

  try {
    const response = await fetch(
      `/api/purchase-requests?page=${pageNumber}`,
      { headers: { Accept: 'application/json' } },
    )

    if (!response.ok) {
      throw new Error('Unable to load purchase requests.')
    }

    const result: PaginatedPurchaseRequests = await response.json()

    setPurchaseRequests(result.data)
    setPurchaseRequestPage(result.current_page)
    setPurchaseRequestLastPage(result.last_page)
    setPurchaseRequestTotal(result.total)
  } catch (err) {
    setPurchaseRequestError(
      err instanceof Error
        ? err.message
        : 'Unable to load purchase requests.',
    )
  } finally {
    setPurchaseRequestLoading(false)
  }
}

  async function loadPurchaseRequestOptions() {
    try {
      const [supplierResponse, itemResponse] = await Promise.all([
        fetch('/api/suppliers?per_page=1000', {
          headers: { Accept: 'application/json' },
        }),
        fetch('/api/items?per_page=1000', {
          headers: { Accept: 'application/json' },
        }),
      ])

      if (!supplierResponse.ok || !itemResponse.ok) {
        throw new Error('Unable to load suppliers or inventory items.')
      }

      const supplierResult: PaginatedSuppliers = await supplierResponse.json()
      const itemResult: PaginatedItems = await itemResponse.json()

      setPurchaseRequestSupplierOptions(
        supplierResult.data.filter((supplier) => supplier.status === 'active'),
      )
      setPurchaseRequestItemOptions(itemResult.data)
    } catch (err) {
      setPurchaseRequestFormError(
        err instanceof Error
          ? err.message
          : 'Unable to load form options.',
      )
    }
  }

  
async function savePurchaseRequest(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  setPurchaseRequestSaving(true)
  setPurchaseRequestFormError('')

  const payload = {
    supplier_id: Number(purchaseRequestSupplierId),
    notes: purchaseRequestNotes.trim() || null,
    items: purchaseRequestItems.map((line) => ({
      item_id: Number(line.item_id),
      quantity: Number(line.quantity),
      unit_price: Number(line.unit_price),
    })),
  }

  try {
    const url = editingPurchaseRequest
      ? `/api/purchase-requests/${editingPurchaseRequest.id}`
      : '/api/purchase-requests'

    const response = await fetch(url, {
      method: editingPurchaseRequest ? 'PUT' : 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      const validationMessage = result.errors
        ? Object.values(result.errors).flat().join(' ')
        : result.message

      throw new Error(
        validationMessage || 'Unable to save purchase request.',
      )
    }

    setShowPurchaseRequestForm(false)
    setEditingPurchaseRequest(null)
    setPurchaseRequestSupplierId('')
    setPurchaseRequestNotes('')
    setPurchaseRequestItems([{ ...emptyPurchaseRequestItem }])

    await loadPurchaseRequests(1)
  } catch (err) {
    setPurchaseRequestFormError(
      err instanceof Error
        ? err.message
        : 'Unable to save purchase request.',
    )
  } finally {
    setPurchaseRequestSaving(false)
  }
}

  async function updatePurchaseRequestStatus(
    request: PurchaseRequest,
    status: PurchaseRequestStatus,
  ) {
    setPurchaseRequestError('')

    try {
      const response = await fetch(
        `/api/purchase-requests/${request.id}/status`,
        {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.message || 'Unable to update request status.',
        )
      }

      await loadPurchaseRequests()
    } catch (err) {
      setPurchaseRequestError(
        err instanceof Error
          ? err.message
          : 'Unable to update request status.',
      )
    }
  }

  async function deletePurchaseRequest(request: PurchaseRequest) {
    const confirmed = window.confirm(
      `Delete purchase request ${request.request_number}?`,
    )

    if (!confirmed) return

    setPurchaseRequestError('')

    try {
      const response = await fetch(
        `/api/purchase-requests/${request.id}`,
        {
          method: 'DELETE',
          headers: { Accept: 'application/json' },
        },
      )

      if (!response.ok) {
        const result = await response.json()
        throw new Error(
          result.message || 'Unable to delete purchase request.',
        )
      }

      const nextPage =
        purchaseRequests.length === 1 && purchaseRequestPage > 1
          ? purchaseRequestPage - 1
          : purchaseRequestPage

      await loadPurchaseRequests(nextPage)
    } catch (err) {
      setPurchaseRequestError(
        err instanceof Error
          ? err.message
          : 'Unable to delete purchase request.',
      )
    }
  }



  async function saveSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSupplierSaving(true)
    setSupplierFormError('')

    try {
      const isEditing = editingSupplier !== null
      const url = isEditing
        ? `/api/suppliers/${editingSupplier.id}`
        : '/api/suppliers'

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(supplierForm),
      })

      const result = await response.json()

      if (!response.ok) {
        const messages = result.errors
          ? Object.values(result.errors).flat().join(' ')
          : result.message ?? 'Unable to save supplier.'

        throw new Error(String(messages))
      }

      setShowSupplierForm(false)
      setEditingSupplier(null)
      setSupplierForm(emptySupplierForm)

      await loadSuppliers(isEditing ? supplierPage : 1)
    } catch (err) {
      setSupplierFormError(
        err instanceof Error ? err.message : 'Something went wrong.',
      )
    } finally {
      setSupplierSaving(false)
    }
  }

  async function deleteSupplier(supplier: Supplier) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${supplier.name}"?`,
    )

    if (!confirmed) return

    setSupplierError('')

    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.message ?? 'Unable to delete supplier.')
      }

      const nextPage =
        suppliers.length === 1 && supplierPage > 1
          ? supplierPage - 1
          : supplierPage

      await loadSuppliers(nextPage)
    } catch (err) {
      setSupplierError(
        err instanceof Error ? err.message : 'Failed to delete supplier.',
      )
    }
  }

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
          <a
            className={`nav-link ${activePage === 'inventory' ? 'active' : ''}`}
            href="#inventory"
            onClick={(event) => {
              event.preventDefault()
              setActivePage('inventory')
            }}
          >
            <Package size={18} /> Inventory
            <span className="nav-count">{total}</span>
          </a>
          <a
            className={`nav-link ${activePage === 'suppliers' ? 'active' : ''}`}
            href="#suppliers"
            onClick={(event) => {
              event.preventDefault()
              setActivePage('suppliers')
              void loadSuppliers(1)
            }}
          >
            <Truck size={18} /> Suppliers
            <span className="nav-count">{supplierTotal}</span>
          </a>
          
          <a
          className={`nav-link ${activePage === 'purchases' ? 'active' : ''}`}
          href="#purchases"
          onClick={(event) => {
            event.preventDefault()
            setActivePage('purchases')
            void loadPurchaseRequests(1)
            void loadPurchaseRequestOptions()
          }}
        >
          <ShoppingCart size={18} /> Purchase requests
          <span className="nav-count">{purchaseRequestTotal}</span>
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
          <div className="breadcrumb">
            Workspace <span>/</span>{' '}
            {activePage === 'inventory'
            ? 'Inventory'
            : activePage === 'suppliers'
              ? 'Suppliers'
              : 'Purchase requests'}
          </div>
          <div className="topbar-right">
            <span className="status-dot" /> API connected
            <div className="avatar">JD</div>
          </div>
        </header>

        <section className="page-content">
          <div
              className="page-heading"
              style={{ display: activePage === 'inventory' ? undefined : 'none' }}
          >
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

          <div
            className="stats-grid"
            style={{ display: activePage === 'inventory' ? undefined : 'none' }}
          >
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

          <section
            className="inventory-panel"
            id="inventory"
            style={{ display: activePage === 'inventory' ? undefined : 'none' }}
          >
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
          
          {activePage === 'suppliers' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">SUPPLIER MANAGEMENT</div>
                  <h1>Suppliers</h1>
                  <p>Manage supplier contacts and their current status.</p>
                </div>

                <button
                  className="primary-button"
                  onClick={() => {
                    setEditingSupplier(null)
                    setSupplierForm(emptySupplierForm)
                    setSupplierFormError('')
                    setShowSupplierForm(true)
                  }}
                >
                  <Plus size={17} /> Add supplier
                </button>
              </div>

              {supplierError && (
                <div className="error-banner">
                  <AlertTriangle size={18} />
                  <span>{supplierError}</span>
                  <button onClick={() => void loadSuppliers(supplierPage)}>
                    Retry
                  </button>
                </div>
              )}

              <section className="inventory-panel" id="suppliers">
                <div className="panel-heading">
                  <div>
                    <h2>All suppliers</h2>
                    <p>Supplier directory and contact information.</p>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => void loadSuppliers(supplierPage)}
                    disabled={supplierLoading}
                  >
                    <ArrowDownToLine size={16} /> Refresh
                  </button>
                </div>

                <div className="table-toolbar">
                  <label className="search-box">
                    <Search size={17} />
                    <input
                      value={supplierSearch}
                      onChange={(event) => setSupplierSearch(event.target.value)}
                      placeholder="Search suppliers, contacts, email..."
                    />
                    {supplierSearch && (
                      <button
                        aria-label="Clear search"
                        onClick={() => setSupplierSearch('')}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </label>
                  <span className="result-count">{supplierTotal} records</span>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>SUPPLIER</th>
                        <th>CONTACT</th>
                        <th>EMAIL</th>
                        <th>PHONE</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierLoading ? (
                        <tr>
                          <td colSpan={6} className="empty-state">
                            Loading suppliers...
                          </td>
                        </tr>
                      ) : filteredSuppliers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty-state">
                            <span className="empty-icon">
                              <Truck size={25} />
                            </span>
                            <strong>
                              {supplierSearch
                                ? 'No matching suppliers'
                                : 'No suppliers yet'}
                            </strong>
                            <span>
                              {supplierSearch
                                ? 'Try another search term.'
                                : 'Add your first supplier to get started.'}
                            </span>
                          </td>
                        </tr>
                      ) : (
                        filteredSuppliers.map((supplier) => (
                          <tr key={supplier.id}>
                            <td>
                              <div className="item-cell">
                                <span className="item-avatar">
                                  <Truck size={17} />
                                </span>
                                <span>
                                  <strong>{supplier.name}</strong>
                                  <small>{supplier.address || 'No address provided'}</small>
                                </span>
                              </div>
                            </td>
                            <td>{supplier.contact_name || '—'}</td>
                            <td>{supplier.email || '—'}</td>
                            <td>{supplier.phone || '—'}</td>
                            <td>
                              <span
                                className={`stock-badge ${
                                  supplier.status === 'active' ? 'healthy' : 'low'
                                }`}
                              >
                                <span />
                                {supplier.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  type="button"
                                  className="edit-button"
                                  onClick={() => {
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
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="delete-button"
                                  onClick={() => void deleteSupplier(supplier)}
                                  aria-label={`Delete ${supplier.name}`}
                                >
                                  <Trash2 size={16} />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="table-footer">
                  <span>Page {supplierPage} of {supplierLastPage}</span>
                  <div className="pagination">
                    <button
                      disabled={supplierPage <= 1 || supplierLoading}
                      onClick={() => void loadSuppliers(supplierPage - 1)}
                      aria-label="Previous supplier page"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <span>{supplierPage}</span>
                    <button
                      disabled={supplierPage >= supplierLastPage || supplierLoading}
                      onClick={() => void loadSuppliers(supplierPage + 1)}
                      aria-label="Next supplier page"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}

          {activePage === 'purchases' && (
  <>
    <div className="page-heading">
      <div>
        <div className="eyebrow">PROCUREMENT</div>
        <h1>Purchase requests</h1>
        <p>Create and track requests for inventory purchases.</p>
      </div>
      <button
        className="primary-button"
        onClick={() => {
          setEditingPurchaseRequest(null)
          setPurchaseRequestSupplierId('')
          setPurchaseRequestNotes('')
          setPurchaseRequestItems([{ ...emptyPurchaseRequestItem }])
          setPurchaseRequestFormError('')
          void loadPurchaseRequestOptions()
          setShowPurchaseRequestForm(true)
        }}
      >
        <Plus size={17} /> New request
      </button>
    </div>

    {purchaseRequestError && (
      <div className="error-banner">
        <AlertTriangle size={18} />
        <span>{purchaseRequestError}</span>
        <button onClick={() => void loadPurchaseRequests()}>Retry</button>
      </div>
    )}

    <section className="inventory-panel" id="purchases">
      <div className="panel-heading">
        <div>
          <h2>All purchase requests</h2>
          <p>Requests for inventory purchases from your suppliers.</p>
        </div>
        <button
          className="secondary-button"
          onClick={() => void loadPurchaseRequests()}
          disabled={purchaseRequestLoading}
        >
          <ArrowDownToLine size={16} /> Refresh
        </button>
      </div>

      <div className="table-toolbar">
        <div className="toolbar-group">
          <label className="search-box">
            <Search size={17} />
            <input
              value={purchaseRequestSearch}
              onChange={(event) => setPurchaseRequestSearch(event.target.value)}
              placeholder="Search request number or supplier..."
            />
            {purchaseRequestSearch && (
              <button
                aria-label="Clear search"
                onClick={() => setPurchaseRequestSearch('')}
              >
                <X size={15} />
              </button>
            )}
          </label>

          <select
            className="filter-select"
            value={purchaseRequestStatusFilter}
            onChange={(event) => setPurchaseRequestStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <span className="result-count">{purchaseRequestTotal} records</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>REQUEST</th>
              <th>SUPPLIER</th>
              <th>ITEMS</th>
              <th>TOTAL</th>
              <th>STATUS</th>
              <th>DATE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {purchaseRequestLoading ? (
              <tr>
                <td colSpan={7} className="empty-state">Loading purchase requests...</td>
              </tr>
            ) : filteredPurchaseRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  <span className="empty-icon"><ShoppingCart size={25} /></span>
                  <strong>
                    {purchaseRequestSearch || purchaseRequestStatusFilter !== 'all'
                      ? 'No matching requests'
                      : 'No purchase requests yet'}
                  </strong>
                  <span>
                    {purchaseRequestSearch || purchaseRequestStatusFilter !== 'all'
                      ? 'Try another search term or status.'
                      : 'Create your first request to get started.'}
                  </span>
                </td>
              </tr>
            ) : (
              filteredPurchaseRequests.map((request) => {
                const requestTotal = request.items.reduce(
                  (sum, line) => sum + line.quantity * Number(line.unit_price),
                  0,
                )
                const badge = purchaseStatusBadge[request.status]

                return (
                  <tr key={request.id}>
                    <td>
                      <div className="item-cell">
                        <span className="item-avatar"><ShoppingCart size={17} /></span>
                        <span>
                          <strong>{request.request_number}</strong>
                          <small>{request.notes || 'No notes'}</small>
                        </span>
                      </div>
                    </td>
                    <td>{request.supplier.name}</td>
                    <td>{request.items.length}</td>
                    <td className="price-cell">{currency(requestTotal)}</td>
                    <td>
                      <span className={`stock-badge ${badge.className}`}>
                        <span /> {badge.label}
                      </span>
                    </td>
                    <td>{new Date(request.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="row-actions">
                        {request.status === 'draft' && (
                          <>
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => {
                                setEditingPurchaseRequest(request)
                                setPurchaseRequestSupplierId(String(request.supplier_id))
                                setPurchaseRequestNotes(request.notes ?? '')
                                setPurchaseRequestItems(
                                  request.items.map((line) => ({
                                    item_id: String(line.item_id),
                                    quantity: String(line.quantity),
                                    unit_price: String(line.unit_price),
                                  })),
                                )
                                setPurchaseRequestFormError('')
                                void loadPurchaseRequestOptions()
                                setShowPurchaseRequestForm(true)
                              }}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => void updatePurchaseRequestStatus(request, 'pending')}
                            >
                              Submit
                            </button>

                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => void deletePurchaseRequest(request)}
                            >
                              <Trash2 size={16} /> Delete
                            </button>
                          </>
                        )}

                        {request.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => void updatePurchaseRequestStatus(request, 'approved')}
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => void updatePurchaseRequestStatus(request, 'rejected')}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(request.status === 'approved' || request.status === 'rejected') && (
                          <span className="unit-label">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>Page {purchaseRequestPage} of {purchaseRequestLastPage}</span>
        <div className="pagination">
          <button
            disabled={purchaseRequestPage <= 1 || purchaseRequestLoading}
            onClick={() => void loadPurchaseRequests(purchaseRequestPage - 1)}
            aria-label="Previous purchase request page"
          >
            <ChevronLeft size={17} />
          </button>
          <span>{purchaseRequestPage}</span>
          <button
            disabled={purchaseRequestPage >= purchaseRequestLastPage || purchaseRequestLoading}
            onClick={() => void loadPurchaseRequests(purchaseRequestPage + 1)}
            aria-label="Next purchase request page"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  </>
)}
          <footer
          className="page-footer"
          style={{ display: activePage === 'inventory' ? undefined : 'none' }}
           >
          ERPFlow <span>·</span> Inventory management <span>·</span> Development build
        </footer>
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
      
      {showSupplierForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !supplierSaving) {
              setShowSupplierForm(false)
              setEditingSupplier(null)
              setSupplierForm(emptySupplierForm)
              setSupplierFormError('')
            }
          }}
        >
          <section
            className="item-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-modal-title"
          >
            <div className="modal-heading">
              <div>
                <div className="eyebrow">SUPPLIER MANAGEMENT</div>
                <h2 id="supplier-modal-title">
                  {editingSupplier ? 'Edit supplier' : 'Add new supplier'}
                </h2>
                <p>Enter the supplier's business and contact details.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close supplier form"
                onClick={() => {
                  if (supplierSaving) return
                  setShowSupplierForm(false)
                  setEditingSupplier(null)
                  setSupplierForm(emptySupplierForm)
                  setSupplierFormError('')
                }}
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveSupplier}>
              <div className="form-grid">
                <label className="full-field">
                  Supplier name <span>*</span>
                  <input
                    required
                    maxLength={255}
                    value={supplierForm.name}
                    onChange={(event) =>
                      setSupplierForm({
                        ...supplierForm,
                        name: event.target.value,
                      })
                    }
                    placeholder="e.g. ABC Industrial Supplies"
                  />
                </label>

                <label>
                  Contact person
                  <input
                    maxLength={255}
                    value={supplierForm.contact_name}
                    onChange={(event) =>
                      setSupplierForm({
                        ...supplierForm,
                        contact_name: event.target.value,
                      })
                    }
                    placeholder="Contact person's name"
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    maxLength={255}
                    value={supplierForm.email}
                    onChange={(event) =>
                      setSupplierForm({
                        ...supplierForm,
                        email: event.target.value,
                      })
                    }
                    placeholder="contact@example.com"
                  />
                </label>

                <label>
                  Phone
                  <input
                    maxLength={50}
                    value={supplierForm.phone}
                    onChange={(event) =>
                      setSupplierForm({
                        ...supplierForm,
                        phone: event.target.value,
                      })
                    }
                    placeholder="Contact number"
                  />
                </label>

                <label>
                  Status
                  <select
                    value={supplierForm.status}
                    onChange={(event) =>
                      setSupplierForm({
                        ...supplierForm,
                        status: event.target.value as 'active' | 'inactive',
                      })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>

                <label className="full-field">
                  Address
                  <textarea
                    rows={2}
                    value={supplierForm.address}
                    onChange={(event) =>
                      setSupplierForm({
                        ...supplierForm,
                        address: event.target.value,
                      })
                    }
                    placeholder="Business address"
                  />
                </label>

                <label className="full-field">
                  Notes
                  <textarea
                    rows={3}
                    value={supplierForm.notes}
                    onChange={(event) =>
                      setSupplierForm({
                        ...supplierForm,
                        notes: event.target.value,
                      })
                    }
                    placeholder="Optional notes"
                  />
                </label>
              </div>

              {supplierFormError && (
                <div className="form-error">
                  <AlertTriangle size={16} />
                  {supplierFormError}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={supplierSaving}
                  onClick={() => {
                    setShowSupplierForm(false)
                    setEditingSupplier(null)
                    setSupplierForm(emptySupplierForm)
                    setSupplierFormError('')
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={supplierSaving}
                >
                  {supplierSaving
                    ? 'Saving...'
                    : editingSupplier
                      ? 'Save changes'
                      : <><Plus size={16} /> Create supplier</>}
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

    
    {showPurchaseRequestForm && (
  <div className="modal-backdrop">
    <section className="item-modal" role="dialog" aria-modal="true" aria-labelledby="purchase-modal-title">
      <div className="modal-heading">
        <div>
          <div className="eyebrow">PROCUREMENT</div>
          <h2 id="purchase-modal-title">
            {editingPurchaseRequest ? 'Edit purchase request' : 'New purchase request'}
          </h2>
          <p>Choose a supplier and the items you want to order.</p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close purchase request form"
          onClick={() => {
            setShowPurchaseRequestForm(false)
            setEditingPurchaseRequest(null)
            setPurchaseRequestFormError('')
          }}
        >
          <X size={19} />
        </button>
      </div>

      <form onSubmit={savePurchaseRequest}>
        <div className="form-grid">
          <label className="full-field">
            Supplier <span>*</span>
            <select
              required
              value={purchaseRequestSupplierId}
              onChange={(event) => setPurchaseRequestSupplierId(event.target.value)}
            >
              <option value="">Select a supplier</option>
              {purchaseRequestSupplierOptions.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </label>

          <label className="full-field">
            Notes
            <textarea
              rows={3}
              value={purchaseRequestNotes}
              onChange={(event) => setPurchaseRequestNotes(event.target.value)}
              placeholder="Optional purchasing notes"
            />
          </label>
        </div>

        <div className="form-section-heading">
          <h3>Requested items</h3>
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              setPurchaseRequestItems((current) => [...current, { ...emptyPurchaseRequestItem }])
            }
          >
            <Plus size={16} /> Add item
          </button>
        </div>

        {purchaseRequestItems.map((line, index) => (
          <div className="form-grid line-grid" key={index}>
            <label>
              Inventory item <span>*</span>
              <select
                required
                value={line.item_id}
                onChange={(event) => {
                  const itemId = event.target.value
                  const selected = purchaseRequestItemOptions.find(
                    (item) => String(item.id) === itemId,
                  )
                  setPurchaseRequestItems((current) =>
                    current.map((currentLine, i) =>
                      i === index
                        ? {
                            ...currentLine,
                            item_id: itemId,
                            unit_price: selected
                              ? String(selected.unit_price ?? 0)
                              : currentLine.unit_price,
                          }
                        : currentLine,
                    ),
                  )
                }}
              >
                <option value="">Select an item</option>
                {purchaseRequestItemOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>

            <label>
              Quantity <span>*</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={line.quantity}
                onChange={(event) =>
                  setPurchaseRequestItems((current) =>
                    current.map((currentLine, i) =>
                      i === index ? { ...currentLine, quantity: event.target.value } : currentLine,
                    ),
                  )
                }
              />
            </label>

            <label>
              Unit price <span>*</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={line.unit_price}
                onChange={(event) =>
                  setPurchaseRequestItems((current) =>
                    current.map((currentLine, i) =>
                      i === index ? { ...currentLine, unit_price: event.target.value } : currentLine,
                    ),
                  )
                }
              />
            </label>

            <button
              type="button"
              className="delete-button"
              aria-label={`Remove item ${index + 1}`}
              disabled={purchaseRequestItems.length === 1}
              onClick={() =>
                setPurchaseRequestItems((current) =>
                  current.filter((_, i) => i !== index),
                )
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {purchaseRequestFormError && (
          <div className="form-error">
            <AlertTriangle size={16} /> {purchaseRequestFormError}
          </div>
        )}

        <div className="modal-actions">
          <span className="estimated-total">
            Estimated total
            <strong>
              {currency(
                purchaseRequestItems.reduce(
                  (total, line) =>
                    total + Number(line.quantity || 0) * Number(line.unit_price || 0),
                  0,
                ),
              )}
            </strong>
          </span>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setShowPurchaseRequestForm(false)
              setEditingPurchaseRequest(null)
              setPurchaseRequestFormError('')
            }}
          >
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={purchaseRequestSaving}>
            {purchaseRequestSaving
              ? 'Saving...'
              : editingPurchaseRequest
                ? 'Save changes'
                : 'Create request'}
          </button>
        </div>
      </form>
    </section>
  </div>
)}
  
    </div>
  )
}

export default App
