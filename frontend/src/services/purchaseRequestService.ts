import { apiRequest } from './api'

const purchaseRequestsEndpoint = '/api/purchase-requests'

export function listPurchaseRequests(
  page = 1,
  perPage?: number,
): Promise<Response> {
  const query = perPage ? `?per_page=${perPage}` : `?page=${page}`

  return apiRequest(`${purchaseRequestsEndpoint}${query}`, {
    headers: { Accept: 'application/json' },
  })
}

export function createPurchaseRequest(payload: unknown): Promise<Response> {
  return apiRequest(purchaseRequestsEndpoint, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updatePurchaseRequest(
  id: number,
  payload: unknown,
): Promise<Response> {
  return apiRequest(`${purchaseRequestsEndpoint}/${id}`, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updatePurchaseRequestStatus(
  id: number,
  status: string,
): Promise<Response> {
  return apiRequest(`${purchaseRequestsEndpoint}/${id}/status`, {
    method: 'PATCH',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

export function deletePurchaseRequest(id: number): Promise<Response> {
  return apiRequest(`${purchaseRequestsEndpoint}/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
}
