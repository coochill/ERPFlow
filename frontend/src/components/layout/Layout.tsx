import { useCallback, useState } from 'react'
import '../../styles/global.css'
import Header from './Header'
import Sidebar, { type WorkspacePage } from './Sidebar'
import WorkspacePages from './WorkspacePages'

function Layout() {
  const [activePage, setActivePage] = useState<WorkspacePage>('inventory')
  const [inventoryTotal, setInventoryTotal] = useState(0)
  const [supplierTotal, setSupplierTotal] = useState(0)
  const [purchaseRequestTotal, setPurchaseRequestTotal] = useState(0)
  const handleSummaryChange = useCallback(
    ({
      inventory,
      suppliers,
      purchases,
    }: {
      inventory: number
      suppliers: number
      purchases: number
    }) => {
      setInventoryTotal(inventory)
      setSupplierTotal(suppliers)
      setPurchaseRequestTotal(purchases)
    },
    [],
  )

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        inventoryTotal={inventoryTotal}
        supplierTotal={supplierTotal}
        purchaseRequestTotal={purchaseRequestTotal}
        onPageChange={setActivePage}
        onSuppliersOpen={() => setActivePage('suppliers')}
        onPurchasesOpen={() => setActivePage('purchases')}
        onReceivingOpen={() => setActivePage('receiving')}
      />

      <main className="main-content">
        <Header activePage={activePage} />
        <WorkspacePages
          activePage={activePage}
          onSummaryChange={handleSummaryChange}
        />
      </main>
    </div>
  )
}

export default Layout
