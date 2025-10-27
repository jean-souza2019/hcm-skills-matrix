import { api } from './client'

import type { KPIsResponse, TrendResponse } from '@/types/domain'

export async function fetchKpis() {
  const { data } = await api.get<KPIsResponse>('/dashboard/kpis')
  return data
}

export async function fetchTrends() {
  const { data } = await api.get<TrendResponse>('/dashboard/trends')
  return data
}
