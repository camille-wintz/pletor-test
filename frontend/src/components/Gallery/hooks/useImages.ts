import { useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { Image } from '../../../api-types/image'

const API_URL = '/api/images/'

export const PAGE_SIZE = 20
export const imagesQueryKey = ['images'] as const

async function fetchImagesPage(pageParam: number): Promise<Image[]> {
  const offset = pageParam * PAGE_SIZE
  const res = await fetch(`${API_URL}?limit=${PAGE_SIZE}&offset=${offset}`)
  if (!res.ok) throw new Error('Failed to fetch images')
  return res.json()
}

export function useImages(initialPage: number = 0) {
  const query = useInfiniteQuery({
    queryKey: imagesQueryKey,
    queryFn: ({ pageParam }) => fetchImagesPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
  })

  const loadedPages = query.data?.pages.length ?? 0
  const stillFetching =
    query.isLoading || query.isFetchingNextPage || query.hasNextPage
  const isCatchingUp = loadedPages <= initialPage && stillFetching

  useEffect(() => {
    if (loadedPages > initialPage) return
    if (!query.hasNextPage) return
    if (query.isFetchingNextPage) return
    query.fetchNextPage()
  }, [
    loadedPages,
    initialPage,
    query.hasNextPage,
    query.isFetchingNextPage,
    query.fetchNextPage,
  ])

  return { ...query, isCatchingUp }
}
