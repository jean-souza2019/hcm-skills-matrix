import { api } from './client'

import type { SkillClaim, SkillLevel } from '@/types/domain'

export interface ClaimPayload {
  moduleId: string
  currentLevel: SkillLevel
  evidence?: string | null
}

export interface UpdateClaimPayload {
  currentLevel?: SkillLevel
  evidence?: string | null
}

export interface ClaimFilters {
  collaboratorId?: string
  me?: boolean
}

export async function upsertClaim(payload: ClaimPayload) {
  const { data } = await api.post<SkillClaim>('/skills/claim', payload)
  return data
}

export async function listClaims(filters: ClaimFilters = {}) {
  const params = new URLSearchParams()
  if (filters.collaboratorId) params.set('collaboratorId', filters.collaboratorId)
  if (filters.me) params.set('me', String(filters.me))

  const query = params.toString()
  const { data } = await api.get<SkillClaim[]>(
    query ? `/skills/claim?${query}` : '/skills/claim',
  )
  return data
}

export async function updateClaim(id: string, payload: UpdateClaimPayload) {
  const { data } = await api.put<SkillClaim>(`/skills/claim/${id}`, payload)
  return data
}
