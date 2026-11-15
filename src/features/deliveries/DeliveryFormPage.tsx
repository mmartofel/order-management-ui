import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getListDeliveriesQueryKey, useCreateDelivery } from '@/api/generated/endpoints/deliveries/deliveries'
import { CreateDeliveryBody } from '@/api/generated/endpoints/deliveries/deliveries.zod'
import { ResourceForm } from '@/components/app/form/ResourceForm'
import { PageHeader } from '@/components/app/PageHeader'
import { useListHref } from '@/components/app/list/listState'
import { getResource } from '@/manifest'

const deliveries = getResource('deliveries')

/**
 * The create page of a command resource: the create returns only { id, version }; the form then opens the detail
 * page, which waits until the read model has the record. There is no edit page.
 */
export function DeliveryCreatePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const create = useCreateDelivery()
  return (
    <>
      <PageHeader title={t('deliveries.newTitle')} />
      <ResourceForm
        resource={deliveries}
        schema={CreateDeliveryBody}
        save={(data) => create.mutateAsync({ data })}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() })}
        cancelHref={useListHref(deliveries)}
      />
    </>
  )
}
