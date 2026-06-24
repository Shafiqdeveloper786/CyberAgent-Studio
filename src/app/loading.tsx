/* ── Content-area skeleton for dashboard pages ── */
export default function Loading() {
  return (
    <div className="flex flex-col h-full w-full bg-slate-50">
      {/* Skeleton header bar */}
      <div className="shrink-0 px-6 py-4 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-8 w-24 rounded-xl bg-slate-200 animate-pulse" />
        </div>
      </div>

      {/* Skeleton content grid */}
      <div className="flex-1 p-6 space-y-4 overflow-hidden">
        {/* Filter bar skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-9 w-48 rounded-xl bg-slate-200 animate-pulse ml-auto" />
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1">
          <div className="lg:col-span-2 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="h-4 flex-1 rounded-lg bg-slate-200 animate-pulse" />
                  <div className="h-5 w-20 rounded-lg bg-slate-200 animate-pulse" />
                </div>
                <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse mb-2" />
                <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-100 bg-white h-full min-h-[400px] flex items-center justify-center shadow-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-4 w-48 rounded-lg bg-slate-200 animate-pulse" />
                <div className="h-3 w-64 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}