"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import { clearAllOfflineData } from "@/lib/offline/store";
export function ClearOfflineButton() {
  const [done, setDone] = useState(false);
  return <Button variant="ghost" size="sm" className="self-start" onClick={async () => { if (confirm("Remove offline copies of your data from this device? Unsynced offline changes will be lost.")) { await clearAllOfflineData(); localStorage.removeItem("vg-snapshot-at"); setDone(true); } }}>{done ? "Offline data removed from this device" : "Remove offline data from this device"}</Button>;
}
