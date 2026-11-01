import { ArrowDownToLine, ChevronLeft, ChevronRight, Search, Trash2, Truck, X } from 'lucide-react'
import type { Supplier } from '../../../types/supplier'
import SupplierDetails from './SupplierDetails'

type SupplierTableProps = {
  suppliers: Supplier[]
  loading: boolean
  search: string
  total: number
  page: number
  lastPage: number
  onSearchChange: (value: string) => void
  onRefresh: () => void
  onPageChange: (page: number) => void
  onEdit: (supplier: Supplier) => void
  onDelete: (supplier: Supplier) => void
}

function SupplierTable({
  suppliers,
  loading,
  search,
  total,
  page,
  lastPage,
  onSearchChange,
  onRefresh,
  onPageChange,
  onEdit,
  onDelete,
}: SupplierTableProps) {
  return (
    <section className="inventory-panel supplier-panel" id="suppliers">
      <div className="panel-heading">
        <div>
          <h2>All suppliers</h2>
          <p>Supplier directory and contact information.</p>
        </div>
        <button className="secondary-button" onClick={onRefresh} disabled={loading}>
          <ArrowDownToLine size={16} /> Refresh
        </button>
      </div>

      <div className="table-toolbar">
        <label className="search-box">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search suppliers, contacts, email..."
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
              <th>SUPPLIER</th>
              <th>CONTACT</th>
              <th>EMAIL</th>
              <th>PHONE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="empty-state">Loading suppliers...</td></tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  <span className="empty-icon"><Truck size={25} /></span>
                  <strong>{search ? 'No matching suppliers' : 'No suppliers yet'}</strong>
                  <span>{search ? 'Try another search term.' : 'Add your first supplier to get started.'}</span>
                </td>
              </tr>
            ) : suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td><SupplierDetails supplier={supplier} /></td>
                <td>{supplier.contact_name || '—'}</td>
                <td>{supplier.email || '—'}</td>
                <td>{supplier.phone || '—'}</td>
                <td>
                  <span className={`stock-badge ${supplier.status === 'active' ? 'healthy' : 'low'}`}>
                    <span />
                    {supplier.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="edit-button" onClick={() => onEdit(supplier)}>
                      Edit
                    </button>
                    <button type="button" className="delete-button" onClick={() => onDelete(supplier)} aria-label={`Delete ${supplier.name}`}>
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>Page {page} of {lastPage}</span>
        <div className="pagination">
          <button disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)} aria-label="Previous supplier page">
            <ChevronLeft size={17} />
          </button>
          <span>{page}</span>
          <button disabled={page >= lastPage || loading} onClick={() => onPageChange(page + 1)} aria-label="Next supplier page">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  )
}

export default SupplierTable
