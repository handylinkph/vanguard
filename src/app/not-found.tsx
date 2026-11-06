import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-semibold text-accent-700">404</p>
      <h1 className="text-2xl font-semibold text-navy">Page not found</h1>
      <p className="text-sm text-muted">The page doesn&apos;t exist or you don&apos;t have access to it.</p>
      <div className="flex gap-3 text-sm"><Link href="/dashboard" className="text-brand-700 underline">Dashboard</Link><Link href="/guides" className="text-brand-700 underline">Guides</Link><Link href="/offline" className="text-brand-700 underline">Offline essentials</Link></div>
    </main>
  );
}
