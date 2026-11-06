export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-64 rounded bg-line" /><div className="h-4 w-96 max-w-full rounded bg-line" />
      <div className="grid gap-4 sm:grid-cols-3"><div className="h-32 rounded-xl bg-line" /><div className="h-32 rounded-xl bg-line" /><div className="h-32 rounded-xl bg-line" /></div>
    </div>
  );
}
