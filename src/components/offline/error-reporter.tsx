"use client";
import { useEffect } from "react";
// Sends uncaught client errors to /api/errors for admin error tracking (no personal data).
export function ErrorReporter() {
  useEffect(() => {
    const send = (message: string, detail?: string) => {
      if (!navigator.onLine) return;
      fetch("/api/errors", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: message.slice(0, 900), path: location.pathname, detail: detail?.slice(0, 3000) }) }).catch(() => {});
    };
    const onErr = (e: ErrorEvent) => send(e.message, e.error?.stack);
    const onRej = (e: PromiseRejectionEvent) => send(String(e.reason?.message ?? e.reason), e.reason?.stack);
    window.addEventListener("error", onErr); window.addEventListener("unhandledrejection", onRej);
    return () => { window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onRej); };
  }, []);
  return null;
}
