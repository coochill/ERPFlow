import {
  Activity,
  Boxes,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Truck,
} from 'lucide-react'

export type WorkspacePage =
  | 'inventory'
  | 'suppliers'
  | 'purchases'
  | 'receiving'
  | 'data-import'

type SidebarProps = {
  activePage: WorkspacePage
  inventoryTotal: number
  supplierTotal: number
  purchaseRequestTotal: number
  onReceivingOpen: () => void
  onPageChange: (page: WorkspacePage) => void
  onSuppliersOpen: () => void
  onPurchasesOpen: () => void
}

function Sidebar({
  activePage,
  inventoryTotal,
  supplierTotal,
  purchaseRequestTotal,
  onPageChange,
  onSuppliersOpen,
  onPurchasesOpen,
  onReceivingOpen,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#">
        <span className="brand-mark"><Boxes size={23} /></span>
        <span>ERP<span className="brand-light">Flow</span></span>
      </a>

      <div className="nav-label">WORKSPACE</div>
      <nav className="nav-list">
        <a className="nav-link" href="#overview">
          <LayoutDashboard size={18} /> Overview
        </a>
        <a
          className={`nav-link ${activePage === 'inventory' ? 'active' : ''}`}
          href="#inventory"
          onClick={(event) => {
            event.preventDefault()
            onPageChange('inventory')
          }}
        >
          <Package size={18} /> Inventory
          <span className="nav-count">{inventoryTotal}</span>
        </a>
        <a
          className={`nav-link ${activePage === 'suppliers' ? 'active' : ''}`}
          href="#suppliers"
          onClick={(event) => {
            event.preventDefault()
            onPageChange('suppliers')
            onSuppliersOpen()
          }}
        >
          <Truck size={18} /> Suppliers
          <span className="nav-count">{supplierTotal}</span>
        </a>
        <a
          className={`nav-link ${activePage === 'purchases' ? 'active' : ''}`}
          href="#purchases"
          onClick={(event) => {
            event.preventDefault()
            onPageChange('purchases')
            onPurchasesOpen()
          }}
        >
          <ShoppingCart size={18} /> Purchase requests
          <span className="nav-count">{purchaseRequestTotal}</span>
        </a>
        <a
          className={`nav-link ${activePage === 'receiving' ? 'active' : ''}`}
          href="#goods-receiving"
          onClick={(event) => {
            event.preventDefault()
            onPageChange('receiving')
            onReceivingOpen()
          }}
        >
          <ClipboardList size={18} /> Goods receiving
        </a>
        <a
        className={`nav-link ${activePage === 'data-import' ? 'active' : ''}`}
        href="#data-import"
        onClick={(event) => {
          event.preventDefault()
          onPageChange('data-import')
        }}
      >
        <FileSpreadsheet size={18} /> Data Import
      </a>
      </nav>

      <div className="sidebar-bottom">
        <a className="nav-link" href="#activity">
          <Activity size={18} /> Activity
        </a>
        <a className="nav-link" href="#settings">
          <Settings size={18} /> Settings
        </a>
        <div className="workspace-card">
          <span className="workspace-dot" />
          <div>
            <strong>Development</strong>
            <small>Local environment</small>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
