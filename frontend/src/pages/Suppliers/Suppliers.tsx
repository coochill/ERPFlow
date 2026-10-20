import type { ReactNode } from 'react'

type SuppliersProps = {
  children?: ReactNode
}

function Suppliers({ children }: SuppliersProps) {
  return <>{children}</>
}

export default Suppliers
