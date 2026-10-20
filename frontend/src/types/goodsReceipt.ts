import type { Item } from './inventory'
import type {
  PurchaseRequest,
  PurchaseRequestItem,
} from './purchaseRequest'
import type { Supplier } from './supplier'

export type GoodsReceiptReceivedBy = {
  id: number
  name: string
  email: string
}

export type GoodsReceiptItem = {
  id: number
  goods_receipt_id: number
  purchase_request_item_id: number
  quantity_received: number
  unit_price: string
  purchase_request_item: PurchaseRequestItem & {
    item: Item
  }
}

export type GoodsReceiptPurchaseRequest = Omit<
  PurchaseRequest,
  'items'
> & {
  items?: PurchaseRequestItem[]
}

export type GoodsReceipt = {
  id: number
  receipt_number: string
  purchase_request_id: number
  supplier_id: number
  received_by: GoodsReceiptReceivedBy | null
  received_at: string
  notes: string | null
  purchase_request: GoodsReceiptPurchaseRequest
  supplier: Supplier
  items: GoodsReceiptItem[]
  created_at: string
  updated_at: string
}

export type PaginatedGoodsReceipts = {
  data: GoodsReceipt[]
  current_page: number
  last_page: number
  total: number
}

export type GoodsReceiptResponse = {
  data: GoodsReceipt
}

export type GoodsReceiptFormItem = {
  purchase_request_item_id: number
  quantity_received: number
}

export type CreateGoodsReceiptPayload = {
  purchase_request_id: number
  notes?: string | null
  items: GoodsReceiptFormItem[]
}
