"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Sparkles } from "lucide-react";
import { Button, Textarea, Alert } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string; sources?: { n: number; title: string; href: string }[] }

const STARTERS = ["What should be in a go-bag for a family with a baby?", "How do I prepare my house before a typhoon?", "What should we do right after an earthquake?", "How much water should we store for 4 people?"];

export function Chat({ conversationId: initialId, initial, configured }: { conversationId: string | null; initial: Msg[]; configured: boolean }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [conversationId, setConversationId] = useState(initialId);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  async function send(text: string) {
    const message = text.trim(); if (!message || busy) return;
    if (!navigator.onLine) { setError("You're offline. The assistant needs an internet connection — your saved guides are available on the Offline page."); return; }
    setError(null); setBusy(true); setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId, message }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); if (data.urgentNotice) setMessages((m) => [...m, { role: "assistant", content: data.urgentNotice }]); return; }
      setMessages((m) => [...m, { role: "assistant", content: data.reply, sources: data.sources }]);
      if (!conversationId) { setConversationId(data.conversationId); router.replace(`/assistant?c=${data.conversationId}`, { scroll: false }); }
    } catch { setError("Network error — please try again."); }
    finally { setBusy(false); }
  }

  if (!configured) return (
    <Alert tone="warning" title="Assistant unavailable">The AI assistant isn&apos;t configured on this server yet (no AI provider key). Administrators can enable it by setting <code>ANTHROPIC_API_KEY</code>. Meanwhile, browse the <Link className="underline" href="/guides">preparedness guides</Link> and <Link className="underline" href="/library">resource library</Link>.</Alert>
  );

  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-[28rem] flex-col rounded-xl border border-line bg-white">
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Sparkles className="size-8 text-accent" /><p className="font-medium">Ask about preparing for typhoons, earthquakes, floods, kits or plans.</p>
            <div className="flex max-w-2xl flex-wrap justify-center gap-2">{STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1.5 text-xs hover:bg-surface">{s}</button>)}</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", m.role === "user" ? "bg-navy text-white" : "bg-surface text-ink")}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 border-t border-line pt-2 text-xs"><span className="font-medium">Sources: </span>
                  {m.sources.map((s) => <Link key={s.n} href={s.href} className="mr-2 text-brand-700 underline">[{s.n}] {s.title}</Link>)}</div>)}
            </div>
          </div>
        ))}
        {busy && <p className="text-xs text-muted">Thinking…</p>}
        <div ref={endRef} />
      </div>
      {error && <Alert tone="error" className="mx-4 mb-2">{error}</Alert>}
      <form className="flex gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <label htmlFor="msg" className="sr-only">Your question</label>
        <Textarea id="msg" value={input} onChange={(e) => setInput(e.target.value)} maxLength={2000} placeholder="Ask a preparedness question…" className="min-h-11 flex-1 resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
        <Button disabled={busy || !input.trim()} aria-label="Send"><Send /></Button>
      </form>
    </div>
  );
}
