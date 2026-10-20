import type { ReactNode } from 'react'

type PurchaseRequestsProps = {
  children?: ReactNode
}

function PurchaseRequests({ children }: PurchaseRequestsProps) {
  return <>{children}</>
}

export default PurchaseRequests
