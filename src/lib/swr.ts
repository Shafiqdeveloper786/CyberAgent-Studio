import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAdminMetrics(isAuthenticated: boolean) {
  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated ? "/api/admin" : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  return {
    data,
    error: error?.error ?? null,
    isLoading,
    mutate,
  };
}