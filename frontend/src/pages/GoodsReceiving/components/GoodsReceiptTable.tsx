import { ClipboardList, Eye } from 'lucide-react'
import type { GoodsReceipt } from '../../../types/goodsReceipt'

type GoodsReceiptTableProps = {
  receipts: GoodsReceipt[]
  loading: boolean
  onView: (receipt: GoodsReceipt) => void
}

function GoodsReceiptTable({
  receipts,
  loading,
  onView,
}: GoodsReceiptTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>RECEIPT</th>
            <th>PURCHASE REQUEST</th>
            <th>SUPPLIER</th>
            <th>DATE RECEIVED</th>
            <th>RECEIVED BY</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="empty-state">
                Loading goods receipts...
              </td>
            </tr>
          ) : receipts.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-state">
                <span className="empty-icon"><ClipboardList size={25} /></span>
                <strong>No goods receipts yet</strong>
                <span>Create a receipt from an approved purchase request.</span>
              </td>
            </tr>
          ) : (
            receipts.map((receipt) => (
              <tr key={receipt.id}>
                <td>
                  <div className="item-cell">
                    <span className="item-avatar"><ClipboardList size={17} /></span>
                    <span>
                      <strong>{receipt.receipt_number}</strong>
                      <small>{receipt.notes || 'No notes'}</small>
                    </span>
                  </div>
                </td>
                <td>{receipt.purchase_request?.request_number || '—'}</td>
                <td>{receipt.supplier?.name || '—'}</td>
                <td>{new Date(receipt.received_at).toLocaleDateString()}</td>
                <td>{receipt.received_by?.name || '—'}</td>
                <td>
                  <button
                    type="button"
                    className="edit-button"
                    onClick={() => onView(receipt)}
                  >
                    <Eye size={15} /> View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default GoodsReceiptTable
