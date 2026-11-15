import { Outlet, type RouteObject } from 'react-router'
import { RequireRole } from '@/auth'
import { getResource } from '@/manifest'

const addresses = getResource('addresses')

// Pages load lazily; read routes need a read role, create and edit need a write role (ui-manifest.yaml).
export const addressesRoutes: RouteObject[] = [
  {
    path: addresses.route,
    element: (
      <RequireRole roles={addresses.permissions.read}>
        <Outlet />
      </RequireRole>
    ),
    children: [
      { index: true, lazy: () => import('./AddressesListPage').then((m) => ({ Component: m.AddressesListPage })) },
      { path: ':id', lazy: () => import('./AddressDetailPage').then((m) => ({ Component: m.AddressDetailPage })) },
      {
        element: (
          <RequireRole roles={addresses.permissions.write}>
            <Outlet />
          </RequireRole>
        ),
        children: [
          { path: 'new', lazy: () => import('./AddressFormPage').then((m) => ({ Component: m.AddressCreatePage })) },
          { path: ':id/edit', lazy: () => import('./AddressFormPage').then((m) => ({ Component: m.AddressEditPage })) },
        ],
      },
    ],
  },
]
