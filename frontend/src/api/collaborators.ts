import { api } from './client'

import type { PaginatedResponse } from '@/types/api'
import type { CollaboratorProfile } from '@/types/domain'

export interface CollaboratorPayload {
  fullName: string
  admissionDate: string
  activities?: string[]
  notes?: string | null
  userId?: string | null
  createAccess?: boolean
  accessEmail?: string | null
}

export interface CollaboratorFilters {
  page?: number
  perPage?: number
  name?: string
  activity?: string
}

export async function listCollaborators(filters: CollaboratorFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.perPage) params.set('perPage', String(filters.perPage))
  if (filters.name) params.set('name', filters.name)
  if (filters.activity) params.set('activity', filters.activity)

  const query = params.toString()
  const { data } = await api.get<PaginatedResponse<CollaboratorProfile>>(
    query ? `/collaborators?${query}` : '/collaborators',
  )

  return data
}

export async function fetchCollaborator(id: string) {
  const { data } = await api.get<CollaboratorProfile>(`/collaborators/${id}`)
  return data
}

export interface CollaboratorAccessCredentials {
  email: string
  temporaryPassword: string
}

export interface CollaboratorMutationResponse {
  collaborator: CollaboratorProfile
  accessCredentials?: CollaboratorAccessCredentials
}

export interface ResetAccessResponse {
  accessCredentials: CollaboratorAccessCredentials
}

export async function createCollaborator(payload: CollaboratorPayload) {
  const { data } = await api.post<CollaboratorMutationResponse>('/collaborators', payload)
  return data
}

export async function updateCollaborator(
  id: string,
  payload: CollaboratorPayload,
) {
  const { data } = await api.put<CollaboratorMutationResponse>(
    `/collaborators/${id}`,
    payload,
  )
  return data
}

export async function removeCollaborator(id: string) {
  await api.delete(`/collaborators/${id}`)
}

export async function resetCollaboratorAccess(id: string) {
  const { data } = await api.post<ResetAccessResponse>(`/collaborators/${id}/reset-access`)
  return data
}
