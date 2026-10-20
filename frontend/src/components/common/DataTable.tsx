import type { ReactNode } from 'react'

type DataTableProps = {
  children: ReactNode
  className?: string
}

function DataTable({ children, className = '' }: DataTableProps) {
  return <div className={`table-wrap ${className}`.trim()}>{children}</div>
}

export default DataTable
