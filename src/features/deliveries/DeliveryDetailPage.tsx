import { useQueryClient } from '@tanstack/react-query'
import {
  getListDeliveriesQueryKey,
  useShipDelivery, useCompleteDelivery, useCancelDelivery,
  useGetDelivery,
} from '@/api/generated/endpoints/deliveries/deliveries'
import { CancelDeliveryBody, CompleteDeliveryBody, ShipDeliveryBody } from '@/api/generated/endpoints/deliveries/deliveries.zod'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { ResourceDetail } from '@/components/app/ResourceDetail'
import { useUuidParam } from '@/lib/ids'
import { getResource } from '@/manifest'

const deliveries = getResource('deliveries')
// The input of each action, without the version the page adds.
const schemas = {
  ship: ShipDeliveryBody.omit({ version: true }),
  complete: CompleteDeliveryBody.omit({ version: true }),
  cancel: CancelDeliveryBody.omit({ version: true }),
}

export function DeliveryDetailPage() {
  const id = useUuidParam()
  return id === null ? <NotFoundPage /> : <DeliveryDetail id={id} />
}

function DeliveryDetail({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const query = useGetDelivery(id)
  const ship = useShipDelivery()
  const complete = useCompleteDelivery()
  const cancel = useCancelDelivery()
  return (
    <ResourceDetail
      resource={deliveries}
      query={query}
      commands={{
        run: {
      ship: (data) => ship.mutateAsync({ id, data }),
      complete: (data) => complete.mutateAsync({ id, data }),
      cancel: (data) => cancel.mutateAsync({ id, data }),
        },
        schemas,
        // The detail page reads the record until it reaches the command's version; lists are refetched.
        onChanged: () => void queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() }),
      }}
    />
  )
}
