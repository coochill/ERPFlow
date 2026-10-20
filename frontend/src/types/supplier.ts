export type Supplier = {
  id: number
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export type PaginatedSuppliers = {
  data: Supplier[]
  current_page: number
  last_page: number
  total: number
}
