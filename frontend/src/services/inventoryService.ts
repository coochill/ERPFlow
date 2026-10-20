import { apiRequest } from './api'

const itemsEndpoint = '/api/items'

export function listItems(page = 1, perPage?: number): Promise<Response> {
  const query = perPage ? `?per_page=${perPage}` : `?page=${page}`

  return apiRequest(`${itemsEndpoint}${query}`, {
    headers: { Accept: 'application/json' },
  })
}

export function createItem(payload: unknown): Promise<Response> {
  return apiRequest(itemsEndpoint, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateItem(id: number, payload: unknown): Promise<Response> {
  return apiRequest(`${itemsEndpoint}/${id}`, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteItem(id: number): Promise<Response> {
  return apiRequest(`${itemsEndpoint}/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
}

export function recordMovement(
  itemId: number,
  payload: unknown,
): Promise<Response> {
  return apiRequest(`${itemsEndpoint}/${itemId}/movements`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function listMovements(itemId: number): Promise<Response> {
  return apiRequest(`${itemsEndpoint}/${itemId}/movements`, {
    headers: { Accept: 'application/json' },
  })
}
