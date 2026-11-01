import { Truck } from 'lucide-react'
import type { Supplier } from '../../../types/supplier'

type SupplierDetailsProps = {
  supplier: Supplier
}

function SupplierDetails({ supplier }: SupplierDetailsProps) {
  return (
    <div className="item-cell">
      <span className="item-avatar">
        <Truck size={17} />
      </span>
      <span>
        <strong>{supplier.name}</strong>
        <small>{supplier.address || 'No address provided'}</small>
      </span>
    </div>
  )
}

export default SupplierDetails
