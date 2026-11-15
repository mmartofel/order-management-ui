import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  getGetAddressQueryKey,
  getListAddressesQueryKey,
  useDeleteAddress,
  useListAddresses,
} from '@/api/generated/endpoints/addresses/addresses'
import { ListAddressesQueryParams } from '@/api/generated/endpoints/addresses/addresses.zod'
import { ResourceList } from '@/components/app/list/ResourceList'
import { useListState } from '@/components/app/list/listState'
import { getResource } from '@/manifest'

const addresses = getResource('addresses')

export function AddressesListPage() {
  const queryClient = useQueryClient()
  const list = useListState(addresses, ListAddressesQueryParams)
  const query = useListAddresses(list.apiParams, { query: { placeholderData: keepPreviousData } })
  const remove = useDeleteAddress()
  return (
    <ResourceList
      resource={addresses}
      list={list}
      query={query}
      remove={(record) => remove.mutateAsync({ id: record.id })}
      onDeleted={(record) => {
        queryClient.removeQueries({ queryKey: getGetAddressQueryKey(record.id) })
        void queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() })
      }}
    />
  )
}
