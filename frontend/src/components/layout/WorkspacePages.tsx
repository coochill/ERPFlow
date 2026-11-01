import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkspacePage } from './Sidebar'
import InventoryPage from '../../pages/Inventory/Inventory'
import SuppliersPage from '../../pages/Suppliers/Suppliers'
import PurchaseRequestsPage from '../../pages/PurchaseRequests/PurchaseRequests'
import GoodsReceiving from '../../pages/GoodsReceiving/GoodsReceiving'
import DataImport from '../../pages/DataImport/DataImport'
import AiAssistant from '../../pages/AiAssistant/AiAssistant'

type WorkspacePagesProps = {
  activePage: WorkspacePage
  onSummaryChange: (summary: {
    inventory: number
    suppliers: number
    purchases: number
  }) => void
}

function WorkspacePages({
  activePage,
  onSummaryChange,
}: WorkspacePagesProps) {
  const [visitedPages, setVisitedPages] = useState<Set<WorkspacePage>>(
    new Set<WorkspacePage>(['inventory']),
  )
  const [inventoryTotal, setInventoryTotal] = useState(0)
  const [supplierTotal, setSupplierTotal] = useState(0)
  const [purchaseTotal, setPurchaseTotal] = useState(0)
  const inventoryRefresh = useRef<(() => void) | null>(null)

  useEffect(() => {
    setVisitedPages((current) => {
      if (current.has(activePage)) return current
      return new Set(current).add(activePage)
    })
  }, [activePage])

  const handleInventoryTotal = useCallback(
    (total: number) => {
      setInventoryTotal(total)
    },
    [onSummaryChange],
  )

  const handleSupplierTotal = useCallback(
    (total: number) => {
      setSupplierTotal(total)
    },
    [onSummaryChange],
  )

  const handlePurchaseTotal = useCallback(
    (total: number) => {
      setPurchaseTotal(total)
    },
    [onSummaryChange],
  )

  useEffect(() => {
    onSummaryChange({
      inventory: inventoryTotal,
      suppliers: supplierTotal,
      purchases: purchaseTotal,
    })
  }, [inventoryTotal, onSummaryChange, purchaseTotal, supplierTotal])

  return (
    <section className="page-content">
      <div style={{ display: activePage === 'inventory' ? undefined : 'none' }}>
        <InventoryPage
          onTotalChange={handleInventoryTotal}
          onRefreshReady={(refresh) => {
            inventoryRefresh.current = refresh
          }}
        />
      </div>

      {visitedPages.has('suppliers') && (
        <div style={{ display: activePage === 'suppliers' ? undefined : 'none' }}>
          <SuppliersPage onTotalChange={handleSupplierTotal} />
        </div>
      )}

      {visitedPages.has('purchases') && (
        <div style={{ display: activePage === 'purchases' ? undefined : 'none' }}>
          <PurchaseRequestsPage onTotalChange={handlePurchaseTotal} />
        </div>
      )}

      {visitedPages.has('receiving') && (
        <div style={{ display: activePage === 'receiving' ? undefined : 'none' }}>
          <GoodsReceiving
            onInventoryRefresh={() => inventoryRefresh.current?.()}
          />
        </div>
      )}

      {visitedPages.has('data-import') && (
        <div style={{ display: activePage === 'data-import' ? undefined : 'none' }}>
          <DataImport />
        </div>
      )}

      {visitedPages.has('ai-assistant') && (
        <div style={{ display: activePage === 'ai-assistant' ? undefined : 'none' }}>
          <AiAssistant />
        </div>
      )}
    </section>
  )
}

export default WorkspacePages
