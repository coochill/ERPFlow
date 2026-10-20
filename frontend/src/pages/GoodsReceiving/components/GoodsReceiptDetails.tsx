import { AlertTriangle, X } from 'lucide-react'
import type { GoodsReceipt } from '../../../types/goodsReceipt'

type GoodsReceiptDetailsProps = {
  receipt: GoodsReceipt | null
  loading: boolean
  error: string
  onClose: () => void
}

function GoodsReceiptDetails({
  receipt,
  loading,
  error,
  onClose,
}: GoodsReceiptDetailsProps) {
  return (
    <div className="modal-backdrop">
      <section className="item-modal goods-receipt-details-modal" role="dialog" aria-modal="true" aria-labelledby="goods-receipt-details-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">GOODS RECEIPT</div>
            <h2 id="goods-receipt-details-title">{receipt?.receipt_number || 'Receipt details'}</h2>
            <p>Receipt information and received line items.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close receipt details"><X size={19} /></button>
        </div>

        {loading ? <p>Loading receipt details...</p> : error ? (
          <div className="form-error"><AlertTriangle size={16} /> {error}</div>
        ) : receipt ? (
          <>
            <div className="goods-receipt-detail-grid">
              <div><span>Purchase request</span><strong>{receipt.purchase_request?.request_number || '—'}</strong></div>
              <div><span>Supplier</span><strong>{receipt.supplier?.name || '—'}</strong></div>
              <div><span>Date received</span><strong>{new Date(receipt.received_at).toLocaleString()}</strong></div>
              <div><span>Received by</span><strong>{receipt.received_by?.name || '—'}</strong></div>
            </div>
            {receipt.notes && <p className="goods-receipt-notes-display">{receipt.notes}</p>}
            <div className="table-wrap">
              <table>
                <thead><tr><th>ITEM</th><th>QUANTITY</th><th>UNIT PRICE</th><th>SUBTOTAL</th></tr></thead>
                <tbody>
                  {receipt.items.map((line) => (
                    <tr key={line.id}>
                      <td>{line.purchase_request_item?.item?.name || '—'}</td>
                      <td>{line.quantity_received}</td>
                      <td>{line.unit_price}</td>
                      <td>{(line.quantity_received * Number(line.unit_price)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <p>Receipt not found.</p>}
      </section>
    </div>
  )
}

export default GoodsReceiptDetails
