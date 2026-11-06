"use client";
import { useEffect } from "react";
import Link from "next/link";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/errors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: error.message.slice(0, 900) || "Render error", path: location.pathname, detail: error.digest }) }).catch(() => {});
  }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold text-navy">{offline ? "You're offline" : "Something went wrong"}</h1>
      <p className="text-sm text-muted">{offline ? "This page needs a connection. Your saved essentials are still available." : error.message.includes("backend is not configured") ? "The Vanguard backend isn't configured on this server." : "Please try again. The problem has been reported."}</p>
      <div className="flex gap-3"><button onClick={reset} className="rounded-lg bg-navy px-4 py-2 text-sm text-white">Try again</button><Link href="/offline" className="rounded-lg border border-line px-4 py-2 text-sm">Offline essentials</Link></div>
      <p className="text-xs text-muted">In an emergency call <a href="tel:911" className="font-semibold text-red-700">911</a>.</p>
    </main>
  );
}
