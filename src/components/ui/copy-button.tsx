"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui";
export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const full = text.startsWith("/") && typeof window !== "undefined" ? window.location.origin + text : text;
  return (
    <Button type="button" variant="outline" size="sm" onClick={async () => { await navigator.clipboard.writeText(full); setDone(true); setTimeout(() => setDone(false), 2000); }}>
      {done ? <Check /> : <Copy />}{done ? "Copied" : label}
    </Button>
  );
}
export function PrintButton({ label = "Print" }: { label?: string }) {
  return <Button type="button" variant="outline" onClick={() => window.print()}>{label}</Button>;
}
