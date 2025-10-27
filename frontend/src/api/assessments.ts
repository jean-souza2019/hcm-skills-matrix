import { api } from './client'

import type {
  CareerPlan,
  ManagerAssessment,
  SkillLevel,
} from '@/types/domain'

export interface AssessmentPayload {
  collaboratorId: string
  moduleId: string
  targetLevel: SkillLevel
  comment?: string | null
}

export interface AssessmentFilters {
  collaboratorId?: string
}

export async function upsertAssessment(payload: AssessmentPayload) {
  const { data } = await api.post<ManagerAssessment>('/assessments', payload)
  return data
}

export async function listAssessments(filters: AssessmentFilters = {}) {
  const params = new URLSearchParams()
  if (filters.collaboratorId) {
    params.set('collaboratorId', filters.collaboratorId)
  }
  const query = params.toString()

  const { data } = await api.get<ManagerAssessment[]>(
    query ? `/assessments?${query}` : '/assessments',
  )
  return data
}

export interface CareerPlanPayload {
  collaboratorId: string
  objectives: string
  dueDate?: string | null
  notes?: string | null
  moduleIds?: string[]
}

export async function createCareerPlan(payload: CareerPlanPayload) {
  const { data } = await api.post<CareerPlan>('/assessments/career-plans', payload)
  return data
}

export async function updateCareerPlan(id: string, payload: Partial<CareerPlanPayload>) {
  const { data } = await api.put<CareerPlan>(
    `/assessments/career-plans/${id}`,
    payload,
  )
  return data
}

export async function listCareerPlans(collaboratorId?: string) {
  const params = new URLSearchParams()
  if (collaboratorId) params.set('collaboratorId', collaboratorId)
  const query = params.toString()
  const { data } = await api.get<CareerPlan[]>(
    query ? `/assessments/career-plans?${query}` : '/assessments/career-plans',
  )
  return data
}

export async function removeCareerPlan(id: string) {
  await api.delete(`/assessments/career-plans/${id}`)
}
