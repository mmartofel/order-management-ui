import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getListPaymentsQueryKey, useCreatePayment } from '@/api/generated/endpoints/payments/payments'
import { CreatePaymentBody } from '@/api/generated/endpoints/payments/payments.zod'
import { PaymentCreateRequestMethod } from '@/api/generated/model'
import { ResourceForm } from '@/components/app/form/ResourceForm'
import { PageHeader } from '@/components/app/PageHeader'
import { useListHref } from '@/components/app/list/listState'
import { getResource } from '@/manifest'

const payments = getResource('payments')
const enumValues = { method: Object.values(PaymentCreateRequestMethod) }

/**
 * The create page of a command resource: the create returns only { id, version }; the form then opens the detail
 * page, which waits until the read model has the record. There is no edit page.
 */
export function PaymentCreatePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const create = useCreatePayment()
  return (
    <>
      <PageHeader title={t('payments.newTitle')} />
      <ResourceForm
        resource={payments}
        schema={CreatePaymentBody}
        enumValues={enumValues}
        save={(data) => create.mutateAsync({ data })}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() })}
        cancelHref={useListHref(payments)}
      />
    </>
  )
}
