import { api } from './client'

import type { CoverageEntry } from '@/types/domain'

export interface CoverageFilters {
  collaboratorId: string
  format?: 'json' | 'csv'
}

export async function getCoverageReport(filters: CoverageFilters) {
  const params = new URLSearchParams({
    collaboratorId: filters.collaboratorId,
  })

  if (filters.format) {
    params.set('format', filters.format)
  }

  const query = params.toString()
  const { data } = await api.get<CoverageEntry[]>(`/reports/coverage?${query}`)
  return data
}

export async function downloadCoverageCsv(collaboratorId: string) {
  const params = new URLSearchParams({
    collaboratorId,
    format: 'csv',
  })
  const response = await api.get<string>(`/reports/coverage?${params.toString()}`, {
    responseType: 'text',
  })
  return response.data
}
