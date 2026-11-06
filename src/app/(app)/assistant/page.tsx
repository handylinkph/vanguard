import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader, Alert, ButtonLink, Button } from "@/components/ui";
import { InlineAction } from "@/components/ui/form";
import { Chat } from "@/components/assistant/chat";
import { deleteConversation } from "./actions";
import { cn } from "@/lib/utils";

export const metadata = { title: "AI preparedness assistant" };

export default async function Assistant({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const { supabase } = await requireUser();
  const { data: convos } = await supabase.from("ai_conversations").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(30);
  const current = c && convos?.some((x) => x.id === c) ? c : null;
  const { data: msgs } = current ? await supabase.from("ai_messages").select("role, content, sources").eq("conversation_id", current).order("id") : { data: [] };
  const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "ai_assistant_enabled").maybeSingle();
  const configured = Boolean(process.env.ANTHROPIC_API_KEY) && setting?.value !== false;
  return (
    <>
      <PageHeader title="AI preparedness assistant" description="Ask questions about preparing your household. Answers draw on Vanguard's guides and library, and are personalised using your household profile." actions={<ButtonLink href="/assistant" variant="outline"><Plus />New chat</ButtonLink>} />
      <Alert tone="warning" className="mb-4">AI guidance can be wrong and is <strong>not official emergency instruction</strong>. The assistant has no live hazard information and cannot contact emergency services. In an emergency call <a className="font-semibold underline" href="tel:911">911</a>.</Alert>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Conversations" className="hidden flex-col gap-1 lg:flex">
          {(convos ?? []).map((cv) => (
            <div key={cv.id} className={cn("group flex items-center justify-between rounded-lg px-2 py-1.5 text-sm", cv.id === current ? "bg-white border border-line" : "hover:bg-white")}>
              <Link href={`/assistant?c=${cv.id}`} className="truncate">{cv.title}</Link>
              <InlineAction action={deleteConversation} hidden={{ id: cv.id }} confirm="Delete this conversation?"><Button variant="ghost" size="icon" className="h-7 w-7 opacity-60 group-hover:opacity-100" aria-label="Delete conversation"><Trash2 /></Button></InlineAction>
            </div>))}
        </nav>
        <Chat key={current ?? "new"} conversationId={current} configured={configured}
          initial={(msgs ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content, sources: m.sources as { n: number; title: string; href: string }[] }))} />
      </div>
    </>
  );
}
