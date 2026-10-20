import type { Item } from './inventory'
import type { Supplier } from './supplier'

export type PurchaseRequestStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export type PurchaseRequestItem = {
  id: number
  purchase_request_id: number
  item_id: number
  quantity: number
  unit_price: string
  item: Item
}

export type PurchaseRequest = {
  id: number
  request_number: string
  supplier_id: number
  status: PurchaseRequestStatus
  notes: string | null
  supplier: Supplier
  items: PurchaseRequestItem[]
  created_at: string
  updated_at: string
  receiving_status?: 'not_received' | 'partially_received' | 'fully_received'
}

export type PaginatedPurchaseRequests = {
  data: PurchaseRequest[]
  current_page: number
  last_page: number
  total: number
}

export type PurchaseRequestFormItem = {
  item_id: string
  quantity: string
  unit_price: string
}
