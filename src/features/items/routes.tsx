import { Outlet, type RouteObject } from 'react-router'
import { RequireRole } from '@/auth'
import { getResource } from '@/manifest'

const items = getResource('items')

// Pages load lazily; read routes need a read role, create and edit need a write role (ui-manifest.yaml).
export const itemsRoutes: RouteObject[] = [
  {
    path: items.route,
    element: (
      <RequireRole roles={items.permissions.read}>
        <Outlet />
      </RequireRole>
    ),
    children: [
      { index: true, lazy: () => import('./ItemsListPage').then((m) => ({ Component: m.ItemsListPage })) },
      { path: ':id', lazy: () => import('./ItemDetailPage').then((m) => ({ Component: m.ItemDetailPage })) },
      {
        element: (
          <RequireRole roles={items.permissions.write}>
            <Outlet />
          </RequireRole>
        ),
        children: [
          { path: 'new', lazy: () => import('./ItemFormPage').then((m) => ({ Component: m.ItemCreatePage })) },
          { path: ':id/edit', lazy: () => import('./ItemFormPage').then((m) => ({ Component: m.ItemEditPage })) },
        ],
      },
    ],
  },
]
