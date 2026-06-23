import useSWR, { SWRConfiguration } from "swr";

/** Global JSON fetcher for SWR */
export const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
  return r.json();
});

/** Default SWR options for dashboard data */
const DASHBOARD_SWR_OPTS: SWRConfiguration = {
  revalidateOnFocus: false,
  dedupingInterval: 10_000,   // deduplicate requests within 10s
  errorRetryCount: 3,
  errorRetryInterval: 5_000,
};

/** Hook: fetch agents list with SWR caching */
export function useAgents(userId: string | undefined) {
  return useSWR(
    userId ? "/api/agents" : null,
    fetcher,
    { ...DASHBOARD_SWR_OPTS, revalidateOnFocus: false }
  );
}

/** Hook: fetch admin metrics with SWR caching */
export function useAdminMetrics(isAdmin: boolean) {
  return useSWR(
    isAdmin ? "/api/admin" : null,
    fetcher,
    { ...DASHBOARD_SWR_OPTS, refreshInterval: 30_000 }
  );
}

/** Hook: fetch notifications with auto-refresh */
export function useNotifications(isLoggedIn: boolean) {
  return useSWR(
    isLoggedIn ? "/api/notifications" : null,
    fetcher,
    { ...DASHBOARD_SWR_OPTS, refreshInterval: 30_000 }
  );
}
