import { Outlet, type RouteObject } from 'react-router'
import { RequireRole } from '@/auth'
import { getResource } from '@/manifest'

const deliveries = getResource('deliveries')

// Pages load lazily; read routes need a read role, create needs a write role; a command resource has no edit page (ui-manifest.yaml).
export const deliveriesRoutes: RouteObject[] = [
  {
    path: deliveries.route,
    element: (
      <RequireRole roles={deliveries.permissions.read}>
        <Outlet />
      </RequireRole>
    ),
    children: [
      { index: true, lazy: () => import('./DeliveriesListPage').then((m) => ({ Component: m.DeliveriesListPage })) },
      { path: ':id', lazy: () => import('./DeliveryDetailPage').then((m) => ({ Component: m.DeliveryDetailPage })) },
      {
        element: (
          <RequireRole roles={deliveries.permissions.write}>
            <Outlet />
          </RequireRole>
        ),
        children: [
          { path: 'new', lazy: () => import('./DeliveryFormPage').then((m) => ({ Component: m.DeliveryCreatePage })) },
        ],
      },
    ],
  },
]
