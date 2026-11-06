"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
/** Stopwatch that writes elapsed seconds into a hidden form field. */
export function DrillTimer() {
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  useEffect(() => { if (!running) return; const t = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(t); }, [running]);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-3xl font-semibold text-navy" aria-live="off" role="timer">{mm}:{ss}</span>
      <Button type="button" variant={running ? "outline" : "accent"} onClick={() => setRunning(!running)}>{running ? "Stop" : secs ? "Resume" : "Start drill"}</Button>
      {secs > 0 && !running && <Button type="button" variant="ghost" onClick={() => setSecs(0)}>Reset</Button>}
      <input type="hidden" name="duration_seconds" value={secs} />
    </div>
  );
}
