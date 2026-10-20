import type { WorkspacePage } from './Sidebar'

type HeaderProps = {
  activePage: WorkspacePage
}

function Header({ activePage }: HeaderProps) {
  const pageLabel =
    activePage === 'inventory'
      ? 'Inventory'
      : activePage === 'suppliers'
        ? 'Suppliers'
        : activePage === 'purchases'
          ? 'Purchase requests'
          : 'Goods receiving'

  return (
    <header className="topbar">
      <div className="breadcrumb">
        Workspace <span>/</span> {pageLabel}
      </div>
      <div className="topbar-right">
        <span className="status-dot" /> API connected
        <div className="avatar">JD</div>
      </div>
    </header>
  )
}

export default Header
