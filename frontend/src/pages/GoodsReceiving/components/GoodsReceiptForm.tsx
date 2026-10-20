import { AlertTriangle, X } from 'lucide-react'
import type { FormEvent } from 'react'
import type { PurchaseRequest } from '../../../types/purchaseRequest'
import type { CreateGoodsReceiptPayload } from '../../../types/goodsReceipt'

type GoodsReceiptFormProps = {
  requests: PurchaseRequest[]
  loadingRequests: boolean
  selectedRequest: PurchaseRequest | null
  quantities: Record<number, string>
  notes: string
  saving: boolean
  error: string
  onRequestChange: (requestId: string) => void
  onQuantityChange: (lineId: number, quantity: string) => void
  onNotesChange: (notes: string) => void
  onSubmit: (payload: CreateGoodsReceiptPayload) => void
  onClose: () => void
}

function GoodsReceiptForm({
  requests,
  loadingRequests,
  selectedRequest,
  quantities,
  notes,
  saving,
  error,
  onRequestChange,
  onQuantityChange,
  onNotesChange,
  onSubmit,
  onClose,
}: GoodsReceiptFormProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()

  if (!selectedRequest) return

  const items: CreateGoodsReceiptPayload['items'] = []

  for (const line of selectedRequest.items) {
    const raw = (quantities[line.id] ?? '').trim()

    // Blank or zero means this line is not included in this delivery.
    if (raw === '' || raw === '0') continue

    const quantity = Number(raw)

    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      return
    }

    items.push({
      purchase_request_item_id: line.id,
      quantity_received: quantity,
    })
  }

  if (items.length === 0) return

  onSubmit({
    purchase_request_id: selectedRequest.id,
    notes: notes.trim() || null,
    items,
  })
}

  const hasPositiveQuantity = selectedRequest?.items.some((line) => {
    const raw = (quantities[line.id] ?? '').trim()

    return (
      raw !== '' &&
      Number.isSafeInteger(Number(raw)) &&
      Number(raw) > 0
    )
  }) ?? false

  return (
    <div className="modal-backdrop">
      <section className="item-modal goods-receipt-form-modal" role="dialog" aria-modal="true" aria-labelledby="goods-receipt-form-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">INBOUND OPERATIONS</div>
            <h2 id="goods-receipt-form-title">New goods receipt</h2>
            <p>Receive stock against an approved purchase request.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close goods receipt form">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="full-field">
              Approved purchase request <span>*</span>
              <select
                required
                value={selectedRequest ? String(selectedRequest.id) : ''}
                onChange={(event) => onRequestChange(event.target.value)}
                disabled={loadingRequests || saving}
              >
                <option value="">
                  {loadingRequests ? 'Loading approved requests...' : 'Select a purchase request'}
                </option>
                {requests.map((request) => (
                    <option
                      key={request.id}
                      value={request.id}
                      disabled={request.receiving_status === 'fully_received'}
                    >
                      {request.request_number} · {request.supplier.name}
                      {request.receiving_status === 'partially_received'
                        ? ' · Partially received'
                        : request.receiving_status === 'fully_received'
                          ? ' · Fully received'
                          : ''}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {selectedRequest && (
            <div className="goods-receipt-request">
              <div className="goods-receipt-request-summary">
                <strong>{selectedRequest.supplier.name}</strong>
                <span>{selectedRequest.request_number}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ITEM</th>
                      <th>QTY. ORDERED</th>
                      <th>UNIT PRICE</th>
                      <th>QTY. RECEIVED IN THIS DELIVERY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequest.items.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <strong>{line.item.name}</strong>
                          <small className="table-secondary">{line.item.sku} · {line.item.unit}</small>
                        </td>
                        <td>{line.quantity} {line.item.unit}</td>
                        <td>{line.unit_price}</td>
                        <td>
                          <input
                            className="quantity-input"
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            placeholder="0"
                            value={quantities[line.id] ?? ''}
                            onChange={(event) =>
                              onQuantityChange(line.id, event.target.value)
                            }
                            disabled={saving}
                            aria-label={`Quantity of ${line.item.name} received in this delivery`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedRequest && (
            <p className="form-hint">
              Enter the quantity delivered for at least one item.
              Leave other quantities blank if they were not delivered.
            </p>
          )}

          <label className="full-field">
            Notes
            <textarea rows={3} maxLength={5000} value={notes} onChange={(event) => onNotesChange(event.target.value)} disabled={saving} placeholder="Optional receipt notes" />
          </label>

          {error && (
            <div className="form-error">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button>
            <button
              type="submit"
              className="primary-button"
              disabled={saving || !selectedRequest || !hasPositiveQuantity}
            >
              {saving ? 'Saving...' : 'Create receipt'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default GoodsReceiptForm
