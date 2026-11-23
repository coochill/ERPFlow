export type DashboardStockStatus = {
  in_stock: number
  low_stock: number
  out_of_stock: number
}

export type DashboardMovementTrend = {
  date: string
  incoming: number
  outgoing: number
}

export type DashboardStatusBreakdown = {
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  count: number
}

export type DashboardActivity = {
  id: string
  type:
    | 'inventory_movement'
    | 'purchase_request'
    | 'purchase_request_approved'
    | 'goods_receipt'
  description: string
  record: string
  reference: string | null
  status: string
  quantity: number | null
  occurred_at: string
}

export type DashboardResponse = {
  data: {
    inventory: {
      total_items: number
      total_stock_quantity: number
      low_stock_items: number
      out_of_stock_items: number
      stock_status: DashboardStockStatus
      movement_trends: DashboardMovementTrend[]
    }
    procurement: {
      total_suppliers: number
      pending_requests: number
      approved_requests: number
      pending_receiving: number
      request_status_breakdown: DashboardStatusBreakdown[]
    }
    recent_activities: DashboardActivity[]
  }
}
