import { Outlet, type RouteObject } from 'react-router'
import { RequireRole } from '@/auth'
import { getResource } from '@/manifest'

const payments = getResource('payments')

// Pages load lazily; read routes need a read role, create needs a write role; a command resource has no edit page (ui-manifest.yaml).
export const paymentsRoutes: RouteObject[] = [
  {
    path: payments.route,
    element: (
      <RequireRole roles={payments.permissions.read}>
        <Outlet />
      </RequireRole>
    ),
    children: [
      { index: true, lazy: () => import('./PaymentsListPage').then((m) => ({ Component: m.PaymentsListPage })) },
      { path: ':id', lazy: () => import('./PaymentDetailPage').then((m) => ({ Component: m.PaymentDetailPage })) },
      {
        element: (
          <RequireRole roles={payments.permissions.write}>
            <Outlet />
          </RequireRole>
        ),
        children: [
          { path: 'new', lazy: () => import('./PaymentFormPage').then((m) => ({ Component: m.PaymentCreatePage })) },
        ],
      },
    ],
  },
]
