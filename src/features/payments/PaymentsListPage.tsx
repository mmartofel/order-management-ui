import { keepPreviousData } from '@tanstack/react-query'
import { useListPayments } from '@/api/generated/endpoints/payments/payments'
import { ListPaymentsQueryParams } from '@/api/generated/endpoints/payments/payments.zod'
import { ListPaymentsStatus } from '@/api/generated/model'
import { ResourceList } from '@/components/app/list/ResourceList'
import { useListState } from '@/components/app/list/listState'
import { getResource } from '@/manifest'

const payments = getResource('payments')
const filterValues = { status: Object.values(ListPaymentsStatus) }

// A command resource: no row menu (no edit, no delete); the actions are on the detail page.
export function PaymentsListPage() {
  const list = useListState(payments, ListPaymentsQueryParams)
  const query = useListPayments(list.apiParams, { query: { placeholderData: keepPreviousData } })
  return <ResourceList resource={payments} list={list} query={query} filterValues={filterValues} />
}
