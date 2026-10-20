import { apiRequest } from './api'
import type {
  CreateGoodsReceiptPayload,
  GoodsReceiptResponse,
  PaginatedGoodsReceipts,
} from '../types/goodsReceipt'

const goodsReceiptsEndpoint = '/api/goods-receipts'

export async function listGoodsReceipts(
  page = 1,
): Promise<Response> {
  return apiRequest(`${goodsReceiptsEndpoint}?page=${page}`, {
    headers: { Accept: 'application/json' },
  })
}

export async function createGoodsReceipt(
  payload: CreateGoodsReceiptPayload,
): Promise<Response> {
  return apiRequest(goodsReceiptsEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function getGoodsReceipt(
  goodsReceiptId: number,
): Promise<Response> {
  return apiRequest(`${goodsReceiptsEndpoint}/${goodsReceiptId}`, {
    headers: { Accept: 'application/json' },
  })
}

export type {
  GoodsReceiptResponse,
  PaginatedGoodsReceipts,
}
