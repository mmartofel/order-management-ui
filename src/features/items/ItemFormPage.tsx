import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getGetItemQueryKey,
  getListItemsQueryKey,
  useCreateItem,
  useGetItem,
  useUpdateItem,
} from '@/api/generated/endpoints/items/items'
import { CreateItemBody, UpdateItemBody } from '@/api/generated/endpoints/items/items.zod'
import type { ItemResponse } from '@/api/generated/model'
import { DataState } from '@/components/app/DataState'
import { errorPageFor } from '@/components/app/errorPageFor'
import { FormSkeleton } from '@/components/app/form/FormSkeleton'
import { ResourceForm } from '@/components/app/form/ResourceForm'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { PageHeader } from '@/components/app/PageHeader'
import { useListHref } from '@/components/app/list/listState'
import { useIdParam } from '@/lib/ids'
import { formatDisplay, getResource } from '@/manifest'

const items = getResource('items')
const UpdateFormBody = UpdateItemBody.omit({ version: true })

/** Keeps the cache in step after a save: the detail is replaced, lists are refetched. */
function useOnSaved() {
  const queryClient = useQueryClient()
  return (saved: ItemResponse) => {
    queryClient.setQueryData(getGetItemQueryKey(saved.id), saved)
    void queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() })
  }
}

export function ItemCreatePage() {
  const { t } = useTranslation()
  const create = useCreateItem()
  const onSaved = useOnSaved()
  return (
    <>
      <PageHeader title={t('items.newTitle')} />
      <ResourceForm
        resource={items}
        schema={CreateItemBody}
        save={(data) => create.mutateAsync({ data })}
        onSaved={onSaved}
        cancelHref={useListHref(items)}
      />
    </>
  )
}

export function ItemEditPage() {
  const id = useIdParam()
  return id === null ? <NotFoundPage /> : <ItemEdit id={id} />
}

function ItemEdit({ id }: { id: number }) {
  const { t } = useTranslation()
  const query = useGetItem(id)
  const update = useUpdateItem()
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
            <PageHeader title={t('items.editTitle', { name: formatDisplay(items.display, query.data) })} />
            <ResourceForm
              resource={items}
              schema={UpdateFormBody}
              record={query.data}
              // PUT replaces the record: every field plus the version the user started from.
              save={(data, version) => update.mutateAsync({ id, data: { ...data, version: version! } })}
              onSaved={onSaved}
              reload={async () => (await query.refetch()).data}
              cancelHref={`${items.route}/${id}`}
            />
          </>
        )}
      </DataState>
    )
  )
}
