"use client";
import { useEffect } from "react";
import { clearAllOfflineData } from "@/lib/offline/store";
// If a different account signs in on this device, wipe the previous user's offline cache.
export function SignOutCleanup({ userId }: { userId: string }) {
  useEffect(() => {
    const prev = localStorage.getItem("vg-user");
    if (prev && prev !== userId) { clearAllOfflineData().catch(() => {}); localStorage.removeItem("vg-snapshot-at"); }
    localStorage.setItem("vg-user", userId);
  }, [userId]);
  return null;
}
