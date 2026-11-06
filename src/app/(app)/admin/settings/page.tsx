import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, CardContent, Field, Input, Alert } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { saveSetting } from "../actions";
import { fmtDate } from "@/lib/utils";

export default async function SettingsAdmin() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("app_settings").select("*").order("key");
  return (
    <>
      <PageHeader title="Configuration" description="Platform settings. Values are JSON (true/false, numbers, or quoted text). Changes are audited." />
      <Alert tone="info" className="mb-4">Server secrets (AI provider key, service role key) are configured as environment variables, not here. AI assistant: {process.env.ANTHROPIC_API_KEY ? "API key configured" : "no API key configured — assistant shows an unavailable state"}.</Alert>
      <div className="flex flex-col gap-3">{(data ?? []).map((s) => (
        <Card key={s.key}><CardContent className="pt-5">
          <ActionForm action={saveSetting} className="flex flex-wrap items-end gap-3"><input type="hidden" name="key" value={s.key} />
            <Field label={s.key} htmlFor={s.key} hint={`${s.description ?? ""} Last updated ${fmtDate(s.updated_at)}.`} className="min-w-64 flex-1"><Input id={s.key} name="value" defaultValue={JSON.stringify(s.value)} className="font-mono" /></Field>
            <SubmitButton size="sm">Save</SubmitButton></ActionForm>
        </CardContent></Card>))}</div>
    </>
  );
}
