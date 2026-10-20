import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowDownToLine, Plus } from 'lucide-react'
import {
  createGoodsReceipt,
  getGoodsReceipt,
  listGoodsReceipts,
} from '../../services/goodsReceiptService'
import { listPurchaseRequests } from '../../services/purchaseRequestService'
import type {
  CreateGoodsReceiptPayload,
  GoodsReceipt,
  GoodsReceiptResponse,
  PaginatedGoodsReceipts,
} from '../../types/goodsReceipt'
import type {
  PaginatedPurchaseRequests,
  PurchaseRequest,
} from '../../types/purchaseRequest'
import GoodsReceiptDetails from './components/GoodsReceiptDetails'
import GoodsReceiptForm from './components/GoodsReceiptForm'
import GoodsReceiptTable from './components/GoodsReceiptTable'
import './GoodsReceiving.css'

type GoodsReceivingProps = {
  onInventoryRefresh?: () => void
}

function getApiError(result: { message?: string; errors?: Record<string, string[]> }) {
  if (result.errors) {
    return Object.values(result.errors).flat().join(' ')
  }

  return result.message || 'Unable to complete the goods receipt request.'
}

function GoodsReceiving({ onInventoryRefresh }: GoodsReceivingProps) {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [approvedRequests, setApprovedRequests] = useState<PurchaseRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null)
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [details, setDetails] = useState<GoodsReceipt | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  async function loadReceipts(pageNumber = page) {
    setLoading(true)
    setError('')

    try {
      const response = await listGoodsReceipts(pageNumber)
      const result = await response.json()
      if (!response.ok) throw new Error(getApiError(result))

      const paginated = result as PaginatedGoodsReceipts
      setReceipts(paginated.data)
      setPage(paginated.current_page)
      setLastPage(paginated.last_page)
      setTotal(paginated.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load goods receipts.')
    } finally {
      setLoading(false)
    }
  }

  async function loadApprovedRequests() {
    setRequestsLoading(true)
    setFormError('')

    try {
      const response = await listPurchaseRequests(1, 1000)
      const result = await response.json()
      if (!response.ok) throw new Error(getApiError(result))

      const requests = (result as PaginatedPurchaseRequests).data
      setApprovedRequests(
        requests.filter(
          (request) =>
            request.status === 'approved' &&
            request.receiving_status !== 'fully_received',
        ),
      )
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to load approved purchase requests.')
    } finally {
      setRequestsLoading(false)
    }
  }

  useEffect(() => {
    void loadReceipts(1)
  }, [])

  function openForm() {
    setFormError('')
    setSelectedRequest(null)
    setQuantities({})
    setNotes('')
    setShowForm(true)
    void loadApprovedRequests()
  }

  function selectRequest(requestId: string) {
    const request = approvedRequests.find((candidate) => candidate.id === Number(requestId)) ?? null
    setSelectedRequest(request)
    setQuantities(
      request
        ? Object.fromEntries(request.items.map((line) => [line.id, '']))
        : {},
    )
    setFormError('')
  }

  function updateQuantity(lineId: number, value: string) {
    if (value !== '' && (!/^\d+$/.test(value) || Number(value) < 0)) return
    setQuantities((current) => ({ ...current, [lineId]: value }))
  }

  async function submitReceipt(_payload: CreateGoodsReceiptPayload) {
    setFormError('')

    if (!selectedRequest) {
      setFormError('Please select an approved purchase request.')
      return
    }

    const items: CreateGoodsReceiptPayload['items'] = []

    for (const line of selectedRequest.items) {
      const rawQuantity = quantities[line.id]?.trim() ?? ''

      // Blank means this item was not received in this delivery.
      if (rawQuantity === '') continue

      const quantity = Number(rawQuantity)

      if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        setFormError(
          'Enter a positive whole number for each item being received.',
        )
        return
      }

      items.push({
        purchase_request_item_id: line.id,
        quantity_received: quantity,
      })
    }

    if (items.length === 0) {
      setFormError(
        'Enter the quantity physically received for at least one item.',
      )
      return
    }

    const receiptPayload: CreateGoodsReceiptPayload = {
      purchase_request_id: selectedRequest.id,
      notes: notes.trim(),
      items,
    }

    setSaving(true)

    try {
      const response = await createGoodsReceipt(receiptPayload)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(getApiError(result))
      }

      setShowForm(false)
      setSelectedRequest(null)
      setQuantities({})
      setNotes('')

      await loadReceipts(1)
      await loadApprovedRequests()
      onInventoryRefresh?.()
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Unable to create goods receipt.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function viewReceipt(receipt: GoodsReceipt) {
    setDetails(receipt)
    setDetailsLoading(true)
    setDetailsError('')

    try {
      const response = await getGoodsReceipt(receipt.id)
      const result = await response.json()
      if (!response.ok) throw new Error(getApiError(result))
      setDetails((result as GoodsReceiptResponse).data)
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Unable to load receipt details.')
    } finally {
      setDetailsLoading(false)
    }
  }

  return (
    <section className="goods-receiving-page" id="goods-receiving">
      <div className="page-heading">
        <div>
          <div className="eyebrow">INBOUND OPERATIONS</div>
          <h1>Goods receiving</h1>
          <p>Record deliveries against approved purchase requests.</p>
        </div>
        <button className="primary-button" onClick={openForm}>
          <Plus size={17} /> New goods receipt
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={() => void loadReceipts(page)}>Retry</button>
        </div>
      )}

      <section className="inventory-panel">
        <div className="panel-heading">
          <div>
            <h2>All goods receipts</h2>
            <p>Confirmed deliveries recorded by the receiving team.</p>
          </div>
          <button className="secondary-button" onClick={() => void loadReceipts(page)} disabled={loading}>
            <ArrowDownToLine size={16} /> Refresh
          </button>
        </div>
        <GoodsReceiptTable receipts={receipts} loading={loading} onView={(receipt) => void viewReceipt(receipt)} />
        <div className="table-footer">
          <span>Page {page} of {lastPage}</span>
          <div className="pagination">
            <button disabled={page <= 1 || loading} onClick={() => void loadReceipts(page - 1)} aria-label="Previous receipt page">‹</button>
            <span>{total}</span>
            <button disabled={page >= lastPage || loading} onClick={() => void loadReceipts(page + 1)} aria-label="Next receipt page">›</button>
          </div>
        </div>
      </section>

      {showForm && (
        <GoodsReceiptForm
          requests={approvedRequests}
          loadingRequests={requestsLoading}
          selectedRequest={selectedRequest}
          quantities={quantities}
          notes={notes}
          saving={saving}
          error={formError}
          onRequestChange={selectRequest}
          onQuantityChange={updateQuantity}
          onNotesChange={setNotes}
          onSubmit={(payload) => void submitReceipt(payload)}
          onClose={() => setShowForm(false)}
        />
      )}

      {details && (
        <GoodsReceiptDetails
          receipt={details}
          loading={detailsLoading}
          error={detailsError}
          onClose={() => setDetails(null)}
        />
      )}
    </section>
  )
}

export default GoodsReceiving
