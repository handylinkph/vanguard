import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.rpc("my_data_export");
  if (error) return NextResponse.json({ error: "Export failed" }, { status: 500 });
  return new NextResponse(JSON.stringify({ account_email: u.user.email, ...data }, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="vanguard-my-data-${new Date().toISOString().slice(0, 10)}.json"`, "cache-control": "no-store" },
  });
}
