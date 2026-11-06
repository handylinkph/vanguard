import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [{ data: records }, { data: files }] = await Promise.all([
    supabase.from("incident_records").select("*").order("occurred_on", { ascending: false }),
    supabase.from("incident_attachments").select("incident_id, file_name, mime_type, size_bytes, created_at"),
  ]);
  const body = { exported_at: new Date().toISOString(), note: "Personal incident records exported from Vanguard. Attachments are listed by name; download them individually from each record.", records: (records ?? []).map((r) => ({ ...r, attachments: (files ?? []).filter((f) => f.incident_id === r.id) })) };
  return new NextResponse(JSON.stringify(body, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="vanguard-incident-records.json"`, "cache-control": "no-store" } });
}
