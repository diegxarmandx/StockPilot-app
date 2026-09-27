import { useSearchParams } from 'react-router-dom'
import type { PageResponse } from '../types/api'
import { useResource } from './useResource'

export function useCatalog<T>(resource: 'products' | 'vendors') {
  const [params, setParams] = useSearchParams()
  const search = (params.get('search') || '').slice(0, 200)
  const active = ['true', 'false'].includes(params.get('active') || '') ? params.get('active')! : ''
  const parsedPage = Number(params.get('page') || 0)
  const page =
    Number.isInteger(parsedPage) && parsedPage >= 0 && parsedPage <= 2147483647 ? parsedPage : 0
  const query = new URLSearchParams({ page: String(page), size: '10' })
  if (search) query.set('search', search)
  if (active) query.set('active', active)
  const result = useResource<PageResponse<T>>(`/api/${resource}?${query}`)

  function change(values: { search?: string; active?: string; page?: number }) {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) =>
      value === '' ? next.delete(key) : next.set(key, String(value)),
    )
    if (!('page' in values)) next.delete('page')
    setParams(next)
  }

  return { ...result, search, active, page, change }
}
