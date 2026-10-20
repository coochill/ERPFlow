import { apiRequest } from './api'

const suppliersEndpoint = '/api/suppliers'

export function listSuppliers(page = 1): Promise<Response> {
  return apiRequest(`${suppliersEndpoint}?page=${page}`, {
    headers: { Accept: 'application/json' },
  })
}
export function listAllSuppliers(): Promise<Response> {
  return apiRequest(`${suppliersEndpoint}?per_page=1000`, {
    headers: { Accept: 'application/json' },
  })
}

export function createSupplier(payload: unknown): Promise<Response> {
  return apiRequest(suppliersEndpoint, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateSupplier(id: number, payload: unknown): Promise<Response> {
  return apiRequest(`${suppliersEndpoint}/${id}`, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteSupplier(id: number): Promise<Response> {
  return apiRequest(`${suppliersEndpoint}/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
}
