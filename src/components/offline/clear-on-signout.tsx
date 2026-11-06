"use client";
import { useEffect } from "react";
import { clearAllOfflineData } from "@/lib/offline/store";
export function ClearOfflineOnSignOut() {
  useEffect(() => { clearAllOfflineData().catch(() => {}); localStorage.removeItem("vg-snapshot-at"); localStorage.removeItem("vg-user"); }, []);
  return null;
}
