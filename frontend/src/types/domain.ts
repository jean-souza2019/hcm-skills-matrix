export type Role = 'MASTER' | 'COLABORADOR'

export const skillLevels = [
  'NAO_ATENDE',
  'ATENDE',
  'IMPLANTA_SOZINHO',
  'ESPECIALISTA',
] as const

export type SkillLevel = (typeof skillLevels)[number]

export interface User {
  id: string
  email: string
  role: Role
  createdAt?: string
  mustChangePassword?: boolean
}

export interface CollaboratorProfile {
  id: string
  userId?: string | null
  fullName: string
  admissionDate: string
  activities?: string[] | null
  notes?: string | null
  user?: Pick<User, 'id' | 'email'> | null
}

export interface ModuleRoutine {
  id: string
  code: string
  description: string
  observation?: string | null
}

export interface SkillClaim {
  id: string
  collaboratorId: string
  moduleId: string
  currentLevel: SkillLevel
  evidence?: string | null
  module?: ModuleRoutine
}

export interface ManagerAssessment {
  id: string
  collaboratorId: string
  moduleId: string
  targetLevel: SkillLevel
  comment?: string | null
  module?: ModuleRoutine
}

export interface CareerPlan {
  id: string
  collaboratorId: string
  objectives: string
  dueDate?: string | null
  notes?: string | null
  createdAt?: string
  modules?: CareerPlanModule[]
}

export interface CareerPlanModule {
  id: string
  moduleId: string
  module?: ModuleRoutine
}

export interface CoverageEntry {
  collaboratorId: string
  collaboratorName: string
  moduleId: string
  moduleCode: string
  moduleDescription: string
  currentLevel: SkillLevel | null
  targetLevel: SkillLevel | null
  gap: number | null
}

export interface KPIsResponse {
  totalCollaborators: number
  totalModules: number
  totalClaims: number
  totalAssessments: number
  averageGap: number
}

export interface TrendResponse {
  levelDistribution: Array<{ level: SkillLevel; count: number }>
  topGaps: Array<{
    moduleId: string
    moduleCode: string
    moduleDescription: string
    gap: number | null
  }>
}
