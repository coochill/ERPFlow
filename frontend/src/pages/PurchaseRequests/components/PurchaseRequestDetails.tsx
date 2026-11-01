import { ShoppingCart } from 'lucide-react'
import type { PurchaseRequest, PurchaseRequestStatus } from '../../../types/purchaseRequest'

const statusLabels: Record<PurchaseRequestStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

const statusClasses: Record<PurchaseRequestStatus, string> = {
  draft: 'neutral',
  pending: 'low',
  approved: 'healthy',
  rejected: 'danger',
}

type PurchaseRequestDetailsProps = {
  request: PurchaseRequest
}

function PurchaseRequestDetails({ request }: PurchaseRequestDetailsProps) {
  return (
    <>
      <div className="item-cell">
        <span className="item-avatar"><ShoppingCart size={17} /></span>
        <span>
          <strong>{request.request_number}</strong>
          <small>{request.notes || 'No notes'}</small>
        </span>
      </div>
    </>
  )
}

export function PurchaseRequestStatusBadge({
  status,
}: {
  status: PurchaseRequestStatus
}) {
  return (
    <span className={`stock-badge ${statusClasses[status]}`}>
      <span /> {statusLabels[status]}
    </span>
  )
}

export default PurchaseRequestDetails
