import { api } from './client'

import type { PaginatedResponse } from '@/types/api'
import type { ModuleRoutine } from '@/types/domain'

export interface ModulePayload {
  code: string
  description: string
  observation?: string | null
}

export interface ModuleFilters {
  page?: number
  perPage?: number
  code?: string
  description?: string
}

export async function listModules(filters: ModuleFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.perPage) params.set('perPage', String(filters.perPage))
  if (filters.code) params.set('code', filters.code)
  if (filters.description) params.set('description', filters.description)

  const query = params.toString()

  const { data } = await api.get<PaginatedResponse<ModuleRoutine>>(
    query ? `/modules?${query}` : '/modules',
  )

  return data
}

export async function fetchModule(id: string) {
  const { data } = await api.get<ModuleRoutine>(`/modules/${id}`)
  return data
}

export async function createModule(payload: ModulePayload) {
  const { data } = await api.post<ModuleRoutine>('/modules', payload)
  return data
}

export async function updateModule(id: string, payload: ModulePayload) {
  const { data } = await api.put<ModuleRoutine>(`/modules/${id}`, payload)
  return data
}

export async function removeModule(id: string) {
  await api.delete(`/modules/${id}`)
}
