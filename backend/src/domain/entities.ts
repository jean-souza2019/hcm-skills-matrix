import { Role, SkillLevel } from './enums';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollaboratorProfile {
  id: string;
  userId: string | null;
  fullName: string;
  admissionDate: string;
  activities: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollaboratorWithUser extends CollaboratorProfile {
  user: {
    id: string;
    email: string;
  } | null;
}

export interface ModuleRoutine {
  id: string;
  code: string;
  description: string;
  observation: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillClaim {
  id: string;
  collaboratorId: string;
  moduleId: string;
  currentLevel: SkillLevel;
  evidence: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillClaimWithModule extends SkillClaim {
  module: ModuleRoutine;
}

export interface ManagerAssessment {
  id: string;
  collaboratorId: string;
  moduleId: string;
  targetLevel: SkillLevel;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManagerAssessmentWithModule extends ManagerAssessment {
  module: ModuleRoutine;
}

export interface CareerPlan {
  id: string;
  collaboratorId: string;
  objectives: string;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CareerPlanModule {
  id: string;
  careerPlanId: string;
  moduleId: string;
  createdAt: string;
}

export interface CareerPlanModuleWithModule extends CareerPlanModule {
  module: ModuleRoutine;
}

export interface CareerPlanWithModules extends CareerPlan {
  modules: CareerPlanModuleWithModule[];
}

export interface CollaboratorDetail extends CollaboratorWithUser {
  skillClaims: SkillClaim[];
  assessments: ManagerAssessment[];
  careerPlans: CareerPlan[];
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  payload: unknown;
  createdAt: string;
}
