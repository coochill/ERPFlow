import { apiRequest } from './api'
import type { DashboardResponse } from '../types/dashboard'

export async function getDashboard(): Promise<DashboardResponse> {
  const response = await apiRequest('/api/dashboard', {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Unable to load dashboard data (${response.status}).`)
  }

  return response.json()
}
