export const paths = {
  login: '/login',
  dashboard: '/',
  collaborators: '/collaborators',
  collaboratorCreate: '/collaborators/new',
  collaboratorEdit: (id: string) => `/collaborators/${id}`,
  modules: '/modules',
  selfAssessment: '/self-assessment',
  managerReview: '/manager/review',
  reports: '/reports',
  forcePasswordChange: '/password/update',
} as const
