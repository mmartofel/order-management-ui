import { useQueryClient } from '@tanstack/react-query'
import {
  getGetAddressQueryKey,
  getListAddressesQueryKey,
  useDeleteAddress,
  useGetAddress,
} from '@/api/generated/endpoints/addresses/addresses'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { ResourceDetail } from '@/components/app/ResourceDetail'
import { useIdParam } from '@/lib/ids'
import { getResource } from '@/manifest'

const addresses = getResource('addresses')

export function AddressDetailPage() {
  const id = useIdParam()
  return id === null ? <NotFoundPage /> : <AddressDetail id={id} />
}

function AddressDetail({ id }: { id: number }) {
  const queryClient = useQueryClient()
  const query = useGetAddress(id)
  const remove = useDeleteAddress()
  return (
    <ResourceDetail
      resource={addresses}
      query={query}
      remove={() => remove.mutateAsync({ id })}
      onDeleted={() => {
        queryClient.removeQueries({ queryKey: getGetAddressQueryKey(id) })
        void queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() })
      }}
    />
  )
}
