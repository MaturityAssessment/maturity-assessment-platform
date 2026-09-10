import { Button } from "@/components";

export function DashboardLoading() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      {[210, 250, 330].map((height) => (
        <div
          key={height}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          style={{ minHeight: height }}
        >
          <div className="h-5 w-48 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-72 max-w-full rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function DashboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
      <p className="font-medium text-red-700">{message}</p>
      <Button className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
