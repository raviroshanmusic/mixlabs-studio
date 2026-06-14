import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { full_name, company, profession } = body;

  const update: Record<string, string | boolean | null> = {};
  if (full_name !== undefined)  update.full_name = full_name || null;
  if (company !== undefined)    update.company = company || null;
  if (profession !== undefined) update.profession = profession || null;

  // Notification preferences — only included when the client sends them.
  for (const k of ["notify_new_comment", "notify_new_version", "notify_mention", "notify_email_digest"] as const) {
    if (body[k] !== undefined) update[k] = !!body[k];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
