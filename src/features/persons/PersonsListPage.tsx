import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  getGetPersonQueryKey,
  getListPersonsQueryKey,
  useDeletePerson,
  useListPersons,
} from '@/api/generated/endpoints/persons/persons'
import { ListPersonsQueryParams } from '@/api/generated/endpoints/persons/persons.zod'
import { ResourceList } from '@/components/app/list/ResourceList'
import { useListState } from '@/components/app/list/listState'
import { getResource } from '@/manifest'

const persons = getResource('persons')

export function PersonsListPage() {
  const queryClient = useQueryClient()
  const list = useListState(persons, ListPersonsQueryParams)
  const query = useListPersons(list.apiParams, { query: { placeholderData: keepPreviousData } })
  const remove = useDeletePerson()
  return (
    <ResourceList
      resource={persons}
      list={list}
      query={query}
      remove={(record) => remove.mutateAsync({ id: record.id })}
      onDeleted={(record) => {
        queryClient.removeQueries({ queryKey: getGetPersonQueryKey(record.id) })
        void queryClient.invalidateQueries({ queryKey: getListPersonsQueryKey() })
      }}
    />
  )
}
