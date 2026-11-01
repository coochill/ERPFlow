import { ArrowDownToLine, ChevronLeft, ChevronRight, Package, Search, Trash2, X } from 'lucide-react'
import type { Item } from '../../../types/inventory'

type InventoryTableProps = {
  filteredItems: Item[]
  loading: boolean
  search: string
  total: number
  page: number
  lastPage: number
  currency: (value: number) => string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  onPageChange: (page: number) => void
  onStock: (item: Item) => void
  onEdit: (item: Item) => void
  onDelete: (item: Item) => void
  onAddFirstItem: () => void
}

function InventoryTable({
  filteredItems,
  loading,
  search,
  total,
  page,
  lastPage,
  currency,
  onSearchChange,
  onRefresh,
  onPageChange,
  onStock,
  onEdit,
  onDelete,
  onAddFirstItem,
}: InventoryTableProps) {
  return (
    <section className="inventory-panel" id="inventory">
      <div className="panel-heading">
        <div>
          <h2>All inventory</h2>
          <p>Manage and monitor your stocked items.</p>
        </div>
        <button className="secondary-button" onClick={onRefresh}>
          <ArrowDownToLine size={16} /> Refresh
        </button>
      </div>

      <div className="table-toolbar">
        <label className="search-box">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, SKU, or description..."
          />
          {search && (
            <button aria-label="Clear search" onClick={() => onSearchChange('')}>
              <X size={15} />
            </button>
          )}
        </label>
        <span className="result-count">{total} records</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ITEM</th>
              <th>SKU</th>
              <th>STOCK LEVEL</th>
              <th>UNIT PRICE</th>
              <th>STOCK STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="empty-state">Loading inventory...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  <span className="empty-icon"><Package size={25} /></span>
                  <strong>{search ? 'No matching items' : 'No inventory yet'}</strong>
                  <span>{search ? 'Try another search term.' : 'Add your first item to start tracking stock.'}</span>
                  {!search && (
                    <button className="primary-button small-button" onClick={onAddFirstItem}>
                      <Package size={16} /> Add your first item
                    </button>
                  )}
                </td>
              </tr>
            ) : filteredItems.map((item) => {
              const isLow = item.quantity <= item.reorder_level

              return (
                <tr key={item.id}>
                  <td>
                    <div className="item-cell">
                      <span className="item-avatar"><Package size={17} /></span>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.description || 'No description'}</small>
                      </span>
                    </div>
                  </td>
                  <td><span className="sku">{item.sku}</span></td>
                  <td>
                    <strong>{item.quantity.toLocaleString()}</strong>
                    <span className="unit-label"> {item.unit}</span>
                    <div className="stock-sub">Reorder at {item.reorder_level}</div>
                  </td>
                  <td className="price-cell">{currency(Number(item.unit_price))}</td>
                  <td>
                    <span className={`stock-badge ${isLow ? 'low' : 'healthy'}`}>
                      <span /> {isLow ? 'Low stock' : 'In stock'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="edit-button" onClick={() => onStock(item)}>
                        Stock
                      </button>
                      <button type="button" className="edit-button" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}>
                        Edit
                      </button>
                      <button type="button" className="delete-button" onClick={() => onDelete(item)} title={`Delete ${item.name}`} aria-label={`Delete ${item.name}`}>
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>Page {page} of {lastPage}</span>
        <div className="pagination">
          <button disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
            <ChevronLeft size={17} />
          </button>
          <span>{page}</span>
          <button disabled={page >= lastPage || loading} onClick={() => onPageChange(page + 1)} aria-label="Next page">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  )
}

export default InventoryTable
