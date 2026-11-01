import { ArrowDownToLine, ChevronLeft, ChevronRight, Search, ShoppingCart, Trash2, X } from 'lucide-react'
import type { PurchaseRequest, PurchaseRequestStatus } from '../../../types/purchaseRequest'
import PurchaseRequestDetails, { PurchaseRequestStatusBadge } from './PurchaseRequestDetails'

type PurchaseRequestTableProps = {
  requests: PurchaseRequest[]
  loading: boolean
  search: string
  statusFilter: string
  total: number
  page: number
  lastPage: number
  currency: (value: number) => string
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onRefresh: () => void
  onPageChange: (page: number) => void
  onEdit: (request: PurchaseRequest) => void
  onStatusChange: (request: PurchaseRequest, status: PurchaseRequestStatus) => void
  onDelete: (request: PurchaseRequest) => void
}

function PurchaseRequestTable({
  requests,
  loading,
  search,
  statusFilter,
  total,
  page,
  lastPage,
  currency,
  onSearchChange,
  onStatusFilterChange,
  onRefresh,
  onPageChange,
  onEdit,
  onStatusChange,
  onDelete,
}: PurchaseRequestTableProps) {
  return (
    <section className="inventory-panel purchase-request-panel" id="purchases">
      <div className="panel-heading">
        <div>
          <h2>All purchase requests</h2>
          <p>Requests for inventory purchases from your suppliers.</p>
        </div>
        <button className="secondary-button" onClick={onRefresh} disabled={loading}>
          <ArrowDownToLine size={16} /> Refresh
        </button>
      </div>

      <div className="table-toolbar">
        <div className="toolbar-group">
          <label className="search-box">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search request number or supplier..."
            />
            {search && (
              <button aria-label="Clear search" onClick={() => onSearchChange('')}>
                <X size={15} />
              </button>
            )}
          </label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <span className="result-count">{total} records</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>REQUEST</th>
              <th>SUPPLIER</th>
              <th>ITEMS</th>
              <th>TOTAL</th>
              <th>STATUS</th>
              <th>DATE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="empty-state">Loading purchase requests...</td></tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  <span className="empty-icon"><ShoppingCart size={25} /></span>
                  <strong>{search || statusFilter !== 'all' ? 'No matching requests' : 'No purchase requests yet'}</strong>
                  <span>{search || statusFilter !== 'all' ? 'Try another search term or status.' : 'Create your first request to get started.'}</span>
                </td>
              </tr>
            ) : requests.map((request) => {
              const requestTotal = request.items.reduce(
                (sum, line) => sum + line.quantity * Number(line.unit_price),
                0,
              )

              return (
                <tr key={request.id}>
                  <td><PurchaseRequestDetails request={request} /></td>
                  <td>{request.supplier.name}</td>
                  <td>{request.items.length}</td>
                  <td className="price-cell">{currency(requestTotal)}</td>
                  <td><PurchaseRequestStatusBadge status={request.status} /></td>
                  <td>{new Date(request.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      {request.status === 'draft' && (
                        <>
                          <button type="button" className="edit-button" onClick={() => onEdit(request)}>Edit</button>
                          <button type="button" className="edit-button" onClick={() => onStatusChange(request, 'pending')}>Submit</button>
                          <button type="button" className="delete-button" onClick={() => onDelete(request)}>
                            <Trash2 size={16} /> Delete
                          </button>
                        </>
                      )}
                      {request.status === 'pending' && (
                        <>
                          <button type="button" className="edit-button" onClick={() => onStatusChange(request, 'approved')}>Approve</button>
                          <button type="button" className="delete-button" onClick={() => onStatusChange(request, 'rejected')}>Reject</button>
                        </>
                      )}
                      {(request.status === 'approved' || request.status === 'rejected') && (
                        <span className="unit-label">—</span>
                      )}
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
          <button disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)} aria-label="Previous purchase request page">
            <ChevronLeft size={17} />
          </button>
          <span>{page}</span>
          <button disabled={page >= lastPage || loading} onClick={() => onPageChange(page + 1)} aria-label="Next purchase request page">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  )
}

export default PurchaseRequestTable
