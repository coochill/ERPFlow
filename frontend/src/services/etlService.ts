import { apiRequest } from './api'
import type { ImportPreviewResponse } from '../types/etl'

const inventoryPreviewEndpoint = '/api/etl/inventory/previews'

export function previewInventoryImport(
  file: File,
): Promise<Response> {
  const formData = new FormData()
  formData.append('file', file)

  return apiRequest(inventoryPreviewEndpoint, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  })
}

export async function parseImportPreview(
  response: Response,
): Promise<ImportPreviewResponse> {
  const payload: unknown = await response.json()

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? payload.message
        : 'Unable to preview this file.'

    throw new Error(message)
  }

  return payload as ImportPreviewResponse
}

export function importInventoryPreview(jobId: string): Promise<Response> {
  return apiRequest(
    `/api/etl/inventory/previews/${encodeURIComponent(jobId)}/import`,
    {
      method: 'POST',
      headers: { Accept: 'application/json' },
    },
  )
}
