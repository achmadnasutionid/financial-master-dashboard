import useSWR, { SWRConfiguration } from "swr"

// Default fetcher for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error("Failed to fetch data")
    throw error
  }
  return res.json()
}

// Default SWR configuration for optimal caching
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Don't refetch when window regains focus
  revalidateOnReconnect: true, // Refetch when network reconnects
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  errorRetryCount: 3, // Retry failed requests 3 times
}

/**
 * Custom hook for fetching data with SWR caching
 * @param url - API endpoint to fetch
 * @param config - Optional SWR configuration overrides
 */
export function useFetch<T>(url: string | null, config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    url,
    fetcher,
    { ...defaultConfig, ...config }
  )

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate, // Function to manually update cache or trigger refetch
    refresh: () => mutate(), // Convenience method to refresh data
  }
}

/**
 * Prefetch data into SWR cache (useful for hover prefetching)
 */
export async function prefetch(url: string) {
  try {
    const data = await fetcher(url)
    // This will warm up the cache
    return data
  } catch {
    // Silently fail prefetch
    return null
  }
}

