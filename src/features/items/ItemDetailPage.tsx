import { useQueryClient } from '@tanstack/react-query'
import {
  getGetItemQueryKey,
  getListItemsQueryKey,
  useDeleteItem,
  useGetItem,
} from '@/api/generated/endpoints/items/items'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { ResourceDetail } from '@/components/app/ResourceDetail'
import { useIdParam } from '@/lib/ids'
import { getResource } from '@/manifest'

const items = getResource('items')

export function ItemDetailPage() {
  const id = useIdParam()
  return id === null ? <NotFoundPage /> : <ItemDetail id={id} />
}

function ItemDetail({ id }: { id: number }) {
  const queryClient = useQueryClient()
  const query = useGetItem(id)
  const remove = useDeleteItem()
  return (
    <ResourceDetail
      resource={items}
      query={query}
      remove={() => remove.mutateAsync({ id })}
      onDeleted={() => {
        queryClient.removeQueries({ queryKey: getGetItemQueryKey(id) })
        void queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() })
      }}
    />
  )
}
