import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  getGetItemQueryKey,
  getListItemsQueryKey,
  useDeleteItem,
  useListItems,
} from '@/api/generated/endpoints/items/items'
import { ListItemsQueryParams } from '@/api/generated/endpoints/items/items.zod'
import { ResourceList } from '@/components/app/list/ResourceList'
import { useListState } from '@/components/app/list/listState'
import { getResource } from '@/manifest'

const items = getResource('items')

export function ItemsListPage() {
  const queryClient = useQueryClient()
  const list = useListState(items, ListItemsQueryParams)
  const query = useListItems(list.apiParams, { query: { placeholderData: keepPreviousData } })
  const remove = useDeleteItem()
  return (
    <ResourceList
      resource={items}
      list={list}
      query={query}
      remove={(record) => remove.mutateAsync({ id: record.id })}
      onDeleted={(record) => {
        queryClient.removeQueries({ queryKey: getGetItemQueryKey(record.id) })
        void queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() })
      }}
    />
  )
}
