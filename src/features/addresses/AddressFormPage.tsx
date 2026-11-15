import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getGetAddressQueryKey,
  getListAddressesQueryKey,
  useCreateAddress,
  useGetAddress,
  useUpdateAddress,
} from '@/api/generated/endpoints/addresses/addresses'
import { CreateAddressBody, UpdateAddressBody } from '@/api/generated/endpoints/addresses/addresses.zod'
import type { AddressResponse } from '@/api/generated/model'
import { DataState } from '@/components/app/DataState'
import { errorPageFor } from '@/components/app/errorPageFor'
import { FormSkeleton } from '@/components/app/form/FormSkeleton'
import { ResourceForm } from '@/components/app/form/ResourceForm'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { PageHeader } from '@/components/app/PageHeader'
import { useListHref } from '@/components/app/list/listState'
import { useIdParam } from '@/lib/ids'
import { formatDisplay, getResource } from '@/manifest'

const addresses = getResource('addresses')
const UpdateFormBody = UpdateAddressBody.omit({ version: true })

/** Keeps the cache in step after a save: the detail is replaced, lists are refetched. */
function useOnSaved() {
  const queryClient = useQueryClient()
  return (saved: AddressResponse) => {
    queryClient.setQueryData(getGetAddressQueryKey(saved.id), saved)
    void queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() })
  }
}

export function AddressCreatePage() {
  const { t } = useTranslation()
  const create = useCreateAddress()
  const onSaved = useOnSaved()
  return (
    <>
      <PageHeader title={t('addresses.newTitle')} />
      <ResourceForm
        resource={addresses}
        schema={CreateAddressBody}
        save={(data) => create.mutateAsync({ data })}
        onSaved={onSaved}
        cancelHref={useListHref(addresses)}
      />
    </>
  )
}

export function AddressEditPage() {
  const id = useIdParam()
  return id === null ? <NotFoundPage /> : <AddressEdit id={id} />
}

function AddressEdit({ id }: { id: number }) {
  const { t } = useTranslation()
  const query = useGetAddress(id)
  const update = useUpdateAddress()
  const onSaved = useOnSaved()
  return (
    errorPageFor(query.error) ?? (
      <DataState
        isLoading={query.isPending}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        loading={<FormSkeleton />}
      >
        {query.data && (
          <>
            <PageHeader title={t('addresses.editTitle', { name: formatDisplay(addresses.display, query.data) })} />
            <ResourceForm
              resource={addresses}
              schema={UpdateFormBody}
              record={query.data}
              // PUT replaces the record: every field plus the version the user started from.
              save={(data, version) => update.mutateAsync({ id, data: { ...data, version: version! } })}
              onSaved={onSaved}
              reload={async () => (await query.refetch()).data}
              cancelHref={`${addresses.route}/${id}`}
            />
          </>
        )}
      </DataState>
    )
  )
}
