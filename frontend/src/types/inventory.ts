export type Item = {
  id: number
  sku: string
  name: string
  description: string | null
  quantity: number
  reorder_level: number
  unit_price: string
  unit: string
}

export type PaginatedItems = {
  data: Item[]
  current_page: number
  last_page: number
  total: number
}

export type InventoryMovement = {
  id: number
  item_id: number
  type: 'in' | 'out'
  quantity: number
  reason: string
  created_at: string
}

export type PaginatedMovements = {
  data: InventoryMovement[]
  current_page: number
  last_page: number
  total: number
}
