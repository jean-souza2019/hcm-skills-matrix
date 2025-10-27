import { Outlet, useRoutes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/router/ProtectedRoute'
import { paths } from '@/router/paths'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { LoginPage } from '@/pages/login/LoginPage'
import { CollaboratorsPage } from '@/pages/collaborators/CollaboratorsPage'
import { ModulesPage } from '@/pages/modules/ModulesPage'
import { SelfAssessmentPage } from '@/pages/self-assessment/SelfAssessmentPage'
import { ManagerReviewPage } from '@/pages/manager/ManagerReviewPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { ForcePasswordChangePage } from '@/pages/login/ForcePasswordChangePage'

function AppLayoutWrapper() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export function AppRouter() {
  const element = useRoutes([
    {
      path: paths.login,
      element: <LoginPage />,
    },
    {
      element: <ProtectedRoute />,
      children: [
        {
          path: paths.forcePasswordChange,
          element: <ForcePasswordChangePage />,
        },
        {
          element: <AppLayoutWrapper />,
          children: [
            {
              path: paths.dashboard,
              element: <DashboardPage />,
            },
            {
              path: paths.collaborators,
              element: (
                <ProtectedRoute roles={['MASTER']}>
                  <CollaboratorsPage />
                </ProtectedRoute>
              ),
            },
            {
              path: paths.modules,
              element: (
                <ProtectedRoute roles={['MASTER']}>
                  <ModulesPage />
                </ProtectedRoute>
              ),
            },
            {
              path: paths.selfAssessment,
              element: (
                <ProtectedRoute roles={['COLABORADOR']}>
                  <SelfAssessmentPage />
                </ProtectedRoute>
              ),
            },
            {
              path: paths.managerReview,
              element: (
                <ProtectedRoute roles={['MASTER']}>
                  <ManagerReviewPage />
                </ProtectedRoute>
              ),
            },
            {
              path: paths.reports,
              element: (
                <ProtectedRoute roles={['MASTER', 'COLABORADOR']}>
                  <ReportsPage />
                </ProtectedRoute>
              ),
            },
          ],
        },
      ],
    },
  ])

  return element
}
