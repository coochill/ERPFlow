import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import '../../styles/global.css'
import './PurchaseRequests.css'
import { listAllSuppliers } from '../../services/supplierService'
import {
  createPurchaseRequest,
  deletePurchaseRequest as deletePurchaseRequestRequest,
  listPurchaseRequests,
  updatePurchaseRequest,
  updatePurchaseRequestStatus as updatePurchaseRequestStatusRequest,
} from '../../services/purchaseRequestService'
import { listItems } from '../../services/inventoryService'
import type { Item, PaginatedItems } from '../../types/inventory'
import type {
  PaginatedPurchaseRequests,
  PurchaseRequest,
  PurchaseRequestFormItem,
  PurchaseRequestStatus,
} from '../../types/purchaseRequest'
import type { PaginatedSuppliers, Supplier } from '../../types/supplier'
import PurchaseRequestForm from './components/PurchaseRequestForm'
import PurchaseRequestTable from './components/PurchaseRequestTable'

const emptyPurchaseRequestItem: PurchaseRequestFormItem = {
  item_id: '',
  quantity: '1',
  unit_price: '0',
}

type PurchaseRequestsProps = {
  onTotalChange?: (total: number) => void
}

function PurchaseRequestsPage({ onTotalChange }: PurchaseRequestsProps) {
  const [purchaseRequestSupplierOptions, setPurchaseRequestSupplierOptions] = useState<Supplier[]>([])
  const [purchaseRequestItemOptions, setPurchaseRequestItemOptions] = useState<Item[]>([])
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([])
  const [purchaseRequestPage, setPurchaseRequestPage] = useState(1)
  const [purchaseRequestLastPage, setPurchaseRequestLastPage] = useState(1)
  const [purchaseRequestTotal, setPurchaseRequestTotal] = useState(0)
  const [purchaseRequestLoading, setPurchaseRequestLoading] = useState(false)
  const [purchaseRequestError, setPurchaseRequestError] = useState('')
  const [purchaseRequestSearch, setPurchaseRequestSearch] = useState('')
  const [purchaseRequestStatusFilter, setPurchaseRequestStatusFilter] = useState('all')
  const [showPurchaseRequestForm, setShowPurchaseRequestForm] = useState(false)
  const [editingPurchaseRequest, setEditingPurchaseRequest] = useState<PurchaseRequest | null>(null)
  const [purchaseRequestSaving, setPurchaseRequestSaving] = useState(false)
  const [purchaseRequestFormError, setPurchaseRequestFormError] = useState('')
  const [purchaseRequestSupplierId, setPurchaseRequestSupplierId] = useState('')
  const [purchaseRequestNotes, setPurchaseRequestNotes] = useState('')
  const [purchaseRequestItems, setPurchaseRequestItems] = useState<PurchaseRequestFormItem[]>([
    { ...emptyPurchaseRequestItem },
  ])

  async function loadPurchaseRequests(pageNumber = purchaseRequestPage, showLoading = true) {
    if (showLoading) setPurchaseRequestLoading(true)
    setPurchaseRequestError('')

    try {
      const response = await listPurchaseRequests(pageNumber)
      if (!response.ok) throw new Error('Unable to load purchase requests.')

      const result: PaginatedPurchaseRequests = await response.json()
      setPurchaseRequests(result.data)
      setPurchaseRequestPage(result.current_page)
      setPurchaseRequestLastPage(result.last_page)
      setPurchaseRequestTotal(result.total)
    } catch (err) {
      setPurchaseRequestError(err instanceof Error ? err.message : 'Unable to load purchase requests.')
    } finally {
      setPurchaseRequestLoading(false)
    }
  }

  async function loadPurchaseRequestOptions() {
    try {
      const [supplierResponse, itemResponse] = await Promise.all([
        listAllSuppliers(),
        listItems(1, 1000),
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
      setPurchaseRequestFormError(err instanceof Error ? err.message : 'Unable to load form options.')
    }
  }

  const filteredPurchaseRequests = useMemo(() => {
    const term = purchaseRequestSearch.trim().toLowerCase()

    return purchaseRequests.filter((request) => {
      const matchesSearch = !term ||
        request.request_number.toLowerCase().includes(term) ||
        request.supplier.name.toLowerCase().includes(term)
      const matchesStatus =
        purchaseRequestStatusFilter === 'all' ||
        request.status === purchaseRequestStatusFilter

      return matchesSearch && matchesStatus
    })
  }, [purchaseRequestSearch, purchaseRequestStatusFilter, purchaseRequests])

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
      const response = await (editingPurchaseRequest
        ? updatePurchaseRequest(editingPurchaseRequest.id, payload)
        : createPurchaseRequest(payload))
      const result = await response.json()

      if (!response.ok) {
        const validationMessage = result.errors
          ? Object.values(result.errors).flat().join(' ')
          : result.message
        throw new Error(validationMessage || 'Unable to save purchase request.')
      }

      closeForm()
      await loadPurchaseRequests(1, false)
    } catch (err) {
      setPurchaseRequestFormError(err instanceof Error ? err.message : 'Unable to save purchase request.')
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
      const response = await updatePurchaseRequestStatusRequest(request.id, status)
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to update request status.')
      await loadPurchaseRequests(purchaseRequestPage, false)
    } catch (err) {
      setPurchaseRequestError(err instanceof Error ? err.message : 'Unable to update request status.')
    }
  }

  async function deletePurchaseRequest(request: PurchaseRequest) {
    if (!window.confirm(`Delete purchase request ${request.request_number}?`)) return

    setPurchaseRequestError('')

    try {
      const response = await deletePurchaseRequestRequest(request.id)
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.message || 'Unable to delete purchase request.')
      }

      const nextPage = purchaseRequests.length === 1 && purchaseRequestPage > 1
        ? purchaseRequestPage - 1
        : purchaseRequestPage
      await loadPurchaseRequests(nextPage, false)
    } catch (err) {
      setPurchaseRequestError(err instanceof Error ? err.message : 'Unable to delete purchase request.')
    }
  }

  function closeForm() {
    setShowPurchaseRequestForm(false)
    setEditingPurchaseRequest(null)
    setPurchaseRequestSupplierId('')
    setPurchaseRequestNotes('')
    setPurchaseRequestItems([{ ...emptyPurchaseRequestItem }])
    setPurchaseRequestFormError('')
  }

  function openCreateForm() {
    setEditingPurchaseRequest(null)
    setPurchaseRequestSupplierId('')
    setPurchaseRequestNotes('')
    setPurchaseRequestItems([{ ...emptyPurchaseRequestItem }])
    setPurchaseRequestFormError('')
    void loadPurchaseRequestOptions()
    setShowPurchaseRequestForm(true)
  }

  function editPurchaseRequest(request: PurchaseRequest) {
    setEditingPurchaseRequest(request)
    setPurchaseRequestSupplierId(String(request.supplier_id))
    setPurchaseRequestNotes(request.notes ?? '')
    setPurchaseRequestItems(request.items.map((line) => ({
      item_id: String(line.item_id),
      quantity: String(line.quantity),
      unit_price: String(line.unit_price),
    })))
    setPurchaseRequestFormError('')
    void loadPurchaseRequestOptions()
    setShowPurchaseRequestForm(true)
  }

  const currency = (value: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 2,
    }).format(value)

  useEffect(() => { void loadPurchaseRequests(1) }, [])
  useEffect(() => {
    onTotalChange?.(purchaseRequestTotal)
  }, [onTotalChange, purchaseRequestTotal])

  return (
    <section className="purchase-requests-page" id="purchases">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PROCUREMENT</div>
          <h1>Purchase requests</h1>
          <p>Create and track requests for inventory purchases.</p>
        </div>
        <button className="primary-button" onClick={openCreateForm}>
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

      <PurchaseRequestTable
        requests={filteredPurchaseRequests}
        loading={purchaseRequestLoading}
        search={purchaseRequestSearch}
        statusFilter={purchaseRequestStatusFilter}
        total={purchaseRequestTotal}
        page={purchaseRequestPage}
        lastPage={purchaseRequestLastPage}
        currency={currency}
        onSearchChange={setPurchaseRequestSearch}
        onStatusFilterChange={setPurchaseRequestStatusFilter}
        onRefresh={() => void loadPurchaseRequests()}
        onPageChange={(nextPage) => void loadPurchaseRequests(nextPage)}
        onEdit={editPurchaseRequest}
        onStatusChange={(request, status) => void updatePurchaseRequestStatus(request, status)}
        onDelete={(request) => void deletePurchaseRequest(request)}
      />

      {showPurchaseRequestForm && (
        <PurchaseRequestForm
          editingRequest={editingPurchaseRequest}
          suppliers={purchaseRequestSupplierOptions}
          items={purchaseRequestItemOptions}
          supplierId={purchaseRequestSupplierId}
          notes={purchaseRequestNotes}
          requestItems={purchaseRequestItems}
          saving={purchaseRequestSaving}
          error={purchaseRequestFormError}
          currency={currency}
          onSupplierChange={setPurchaseRequestSupplierId}
          onNotesChange={setPurchaseRequestNotes}
          onItemsChange={setPurchaseRequestItems}
          onSubmit={savePurchaseRequest}
          onClose={closeForm}
        />
      )}
    </section>
  )
}

export default PurchaseRequestsPage
