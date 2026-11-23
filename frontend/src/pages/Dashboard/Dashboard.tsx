import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ClipboardCheck,
  PackageCheck,
  PackageOpen,
  Plus,
  RefreshCw,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import { getDashboard } from '../../services/dashboardService'
import type { DashboardActivity, DashboardResponse } from '../../types/dashboard'
import type { WorkspacePage } from '../../components/layout/Sidebar'
import './Dashboard.css'

type DashboardProps = {
  onPageChange: (page: WorkspacePage) => void
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function activityIcon(activity: DashboardActivity) {
  if (activity.type === 'inventory_movement') {
    return activity.status === 'Incoming'
      ? <ArrowDownToLine size={16} />
      : <ArrowUpFromLine size={16} />
  }
  if (activity.type === 'goods_receipt') return <PackageCheck size={16} />
  if (activity.type === 'purchase_request_approved') {
    return <ClipboardCheck size={16} />
  }
  return <ShoppingCart size={16} />
}

function Dashboard({ onPageChange }: DashboardProps) {
  const [data, setData] = useState<DashboardResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getDashboard()
      setData(response.data)
      setLastUpdated(new Date())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const trendMax = useMemo(() => {
    const values = data?.inventory.movement_trends.flatMap((row) => [
      row.incoming,
      row.outgoing,
    ]) ?? []
    return Math.max(1, ...values)
  }, [data])

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  if (loading && !data) {
    return (
      <section className="dashboard-page" aria-busy="true">
        <div className="dashboard-skeleton dashboard-skeleton-heading" />
        <div className="dashboard-kpi-grid">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="dashboard-skeleton dashboard-skeleton-card" key={index} />
          ))}
        </div>
        <div className="dashboard-skeleton dashboard-skeleton-panel" />
      </section>
    )
  }

  if (error && !data) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-error" role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Dashboard unavailable</strong>
            <p>{error}</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => void loadDashboard()}>
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      </section>
    )
  }

  if (!data) return null

  const inventory = data.inventory
  const procurement = data.procurement
  const stockTotal = inventory.stock_status.in_stock +
    inventory.stock_status.low_stock +
    inventory.stock_status.out_of_stock
  const stockInPercent = stockTotal ? (inventory.stock_status.in_stock / stockTotal) * 100 : 0
  const stockLowPercent = stockTotal ? (inventory.stock_status.low_stock / stockTotal) * 100 : 0

  const procurementTotal = procurement.request_status_breakdown.reduce(
    (total, item) => total + item.count,
    0,
  )
  const procurementStatusColor: Record<string, string> = {
    draft: '#94a3b8',
    pending: '#d59b3a',
    approved: '#168c80',
    rejected: '#c85d65',
  }

  return (
    <section className="dashboard-page" id="overview" aria-labelledby="dashboard-title">
      <div className="dashboard-header">
        <div>
          <div className="eyebrow">WORKSPACE</div>
          <h1 id="dashboard-title">Dashboard</h1>
          <p>Welcome back. Here is today's operational overview.</p>
        </div>
        <div className="dashboard-header-actions">
          <div className="dashboard-date">{dateLabel}</div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'dashboard-spin' : ''} size={15} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="dashboard-inline-error" role="alert">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="dashboard-kpi-section">
        <div className="dashboard-kpi-heading">
          <span>Inventory</span>
          <span className="dashboard-kpi-line" />
        </div>
        <div className="dashboard-kpi-grid">
          <article className="dashboard-kpi-card">
            <div className="dashboard-kpi-icon inventory"><Boxes size={18} /></div>
            <div><span>Inventory items</span><strong>{inventory.total_items.toLocaleString()}</strong></div>
          </article>
          <article className="dashboard-kpi-card">
            <div className="dashboard-kpi-icon inventory"><PackageOpen size={18} /></div>
            <div><span>Stock quantity</span><strong>{inventory.total_stock_quantity.toLocaleString()}</strong></div>
          </article>
          <article className="dashboard-kpi-card">
            <div className="dashboard-kpi-icon warning"><AlertTriangle size={18} /></div>
            <div><span>Low stock items</span><strong>{inventory.low_stock_items.toLocaleString()}</strong></div>
          </article>
          <article className="dashboard-kpi-card">
            <div className="dashboard-kpi-icon danger"><PackageOpen size={18} /></div>
            <div><span>Out of stock</span><strong>{inventory.out_of_stock_items.toLocaleString()}</strong></div>
          </article>
        </div>
      </div>

      <div className="dashboard-kpi-section">
        <div className="dashboard-kpi-heading">
          <span>Procurement</span>
          <span className="dashboard-kpi-line" />
        </div>
        <div className="dashboard-kpi-grid">
          <article className="dashboard-kpi-card">
            <div className="dashboard-kpi-icon pending"><ShoppingCart size={18} /></div>
            <div><span>Pending requests</span><strong>{procurement.pending_requests.toLocaleString()}</strong></div>
          </article>
          <article className="dashboard-kpi-card">
            <div className="dashboard-kpi-icon approved"><ClipboardCheck size={18} /></div>
            <div><span>Approved requests</span><strong>{procurement.approved_requests.toLocaleString()}</strong></div>
          </article>
          <article className="dashboard-kpi-card">
            <div className="dashboard-kpi-icon supplier"><Truck size={18} /></div>
            <div><span>Total suppliers</span><strong>{procurement.total_suppliers.toLocaleString()}</strong></div>
          </article>
          <article className="dashboard-kpi-card">
            <div className="dashboard-kpi-icon receiving"><PackageCheck size={18} /></div>
            <div><span>Pending receiving</span><strong>{procurement.pending_receiving.toLocaleString()}</strong></div>
          </article>
        </div>
      </div>

      <div className="dashboard-overview-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-label">Inventory overview</span><h2>Stock status</h2></div>
          </div>
          {stockTotal > 0 ? (
            <div className="stock-status-layout">
              <div
                className="stock-donut"
                style={{
                  background: `conic-gradient(#168c80 0 ${stockInPercent}%, #d59b3a ${stockInPercent}% ${stockInPercent + stockLowPercent}%, #c85d65 ${stockInPercent + stockLowPercent}% 100%)`,
                }}
              >
                <div><strong>{stockTotal}</strong><span>Total items</span></div>
              </div>
              <div className="stock-legend">
                <div><span className="legend-dot in" /><span>In stock</span><strong>{inventory.stock_status.in_stock}</strong></div>
                <div><span className="legend-dot low" /><span>Low stock</span><strong>{inventory.stock_status.low_stock}</strong></div>
                <div><span className="legend-dot out" /><span>Out of stock</span><strong>{inventory.stock_status.out_of_stock}</strong></div>
              </div>
            </div>
          ) : (
            <div className="dashboard-empty">No inventory records to classify.</div>
          )}
        </section>

        <section className="dashboard-panel movement-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-label">Inventory overview</span><h2>Movement trends</h2></div>
            <span className="dashboard-period">Last 30 days</span>
          </div>
          {inventory.movement_trends.some((row) => row.incoming > 0 || row.outgoing > 0) ? (
            <div className="movement-chart" aria-label="Incoming and outgoing inventory quantities over the last 30 days">
              <div className="movement-chart-bars">
                {inventory.movement_trends.map((row) => (
                  <div className="movement-day" key={row.date} title={`${row.date}: ${row.incoming} in, ${row.outgoing} out`}>
                    <div className="movement-bars">
                      <span className="movement-bar incoming" style={{ height: `${(row.incoming / trendMax) * 100}%` }} />
                      <span className="movement-bar outgoing" style={{ height: `${(row.outgoing / trendMax) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="movement-legend">
                <span><i className="incoming" /> Incoming</span>
                <span><i className="outgoing" /> Outgoing</span>
              </div>
            </div>
          ) : (
            <div className="dashboard-empty">No inventory movements in the last 30 days.</div>
          )}
        </section>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="dashboard-panel procurement-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-label">Procurement overview</span><h2>Purchase requests</h2></div>
          </div>
          {procurementTotal > 0 ? (
            <div className="procurement-status-list">
              {procurement.request_status_breakdown.map((item) => (
                <div className="procurement-status-row" key={item.status}>
                  <div><span className="procurement-status-dot" style={{ background: procurementStatusColor[item.status] }} /><span>{statusLabels[item.status]}</span></div>
                  <strong>{item.count}</strong>
                  <div className="procurement-status-track">
                    <span style={{ width: `${(item.count / procurementTotal) * 100}%`, background: procurementStatusColor[item.status] }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">No purchase requests recorded.</div>
          )}
        </section>

        <section className="dashboard-panel actions-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-label">Shortcuts</span><h2>Quick actions</h2></div>
          </div>
          <div className="dashboard-actions">
            <button type="button" onClick={() => onPageChange('inventory')}><Plus size={16} /> Add inventory item</button>
            <button type="button" onClick={() => onPageChange('purchases')}><ShoppingCart size={16} /> Create purchase request</button>
            <button type="button" onClick={() => onPageChange('suppliers')}><Truck size={16} /> View suppliers</button>
            <button type="button" onClick={() => onPageChange('receiving')}><PackageCheck size={16} /> Receive goods</button>
            <button type="button" onClick={() => onPageChange('inventory')}><ArrowUpFromLine size={16} /> View movements</button>
          </div>
        </section>
      </div>

      <section className="dashboard-panel activities-panel">
        <div className="dashboard-panel-heading">
          <div><span className="dashboard-panel-label">Operations</span><h2>Recent activities</h2></div>
          {lastUpdated && <span className="dashboard-period">Updated {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
        </div>
        {data.recent_activities.length > 0 ? (
          <div className="dashboard-activity-list">
            {data.recent_activities.map((activity) => (
              <article className="dashboard-activity" key={activity.id}>
                <div className={`dashboard-activity-icon ${activity.type}`}>{activityIcon(activity)}</div>
                <div className="dashboard-activity-main">
                  <strong>{activity.description}</strong>
                  <span>{activity.record}{activity.reference ? ` · ${activity.reference}` : ''}</span>
                </div>
                {activity.quantity !== null && <span className="dashboard-activity-quantity">{activity.quantity} units</span>}
                <span className={`dashboard-status status-${activity.status.toLowerCase()}`}>{activity.status}</span>
                <time dateTime={activity.occurred_at}>{formatDateTime(activity.occurred_at)}</time>
              </article>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">No recent operational activity.</div>
        )}
      </section>
    </section>
  )
}

export default Dashboard
