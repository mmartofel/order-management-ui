import { useQueryClient } from '@tanstack/react-query'
import {
  getListPaymentsQueryKey,
  useCompletePayment, useFailPayment, useRefundPayment,
  useGetPayment,
} from '@/api/generated/endpoints/payments/payments'
import { CompletePaymentBody, FailPaymentBody, RefundPaymentBody } from '@/api/generated/endpoints/payments/payments.zod'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { ResourceDetail } from '@/components/app/ResourceDetail'
import { useUuidParam } from '@/lib/ids'
import { getResource } from '@/manifest'

const payments = getResource('payments')
// The input of each action, without the version the page adds.
const schemas = {
  complete: CompletePaymentBody.omit({ version: true }),
  fail: FailPaymentBody.omit({ version: true }),
  refund: RefundPaymentBody.omit({ version: true }),
}

export function PaymentDetailPage() {
  const id = useUuidParam()
  return id === null ? <NotFoundPage /> : <PaymentDetail id={id} />
}

function PaymentDetail({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const query = useGetPayment(id)
  const complete = useCompletePayment()
  const fail = useFailPayment()
  const refund = useRefundPayment()
  return (
    <ResourceDetail
      resource={payments}
      query={query}
      commands={{
        run: {
          complete: (data) => complete.mutateAsync({ id, data }),
          fail: (data) => fail.mutateAsync({ id, data }),
          refund: (data) => refund.mutateAsync({ id, data }),
        },
        schemas,
        // The detail page reads the record until it reaches the command's version; lists are refetched.
        onChanged: () => void queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() }),
      }}
    />
  )
}
