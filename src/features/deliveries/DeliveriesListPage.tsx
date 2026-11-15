import { keepPreviousData } from '@tanstack/react-query'
import { useListDeliveries } from '@/api/generated/endpoints/deliveries/deliveries'
import { ListDeliveriesQueryParams } from '@/api/generated/endpoints/deliveries/deliveries.zod'
import { ListDeliveriesStatus } from '@/api/generated/model'
import { ResourceList } from '@/components/app/list/ResourceList'
import { useListState } from '@/components/app/list/listState'
import { getResource } from '@/manifest'

const deliveries = getResource('deliveries')
const filterValues = { status: Object.values(ListDeliveriesStatus) }

// A command resource: no row menu (no edit, no delete); the actions are on the detail page.
export function DeliveriesListPage() {
  const list = useListState(deliveries, ListDeliveriesQueryParams)
  const query = useListDeliveries(list.apiParams, { query: { placeholderData: keepPreviousData } })
  return <ResourceList resource={deliveries} list={list} query={query} filterValues={filterValues} />
}
