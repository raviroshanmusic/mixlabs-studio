import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Whitelist updatable columns. Never spread the raw body into update():
  // that lets a caller overwrite owner_id, created_at, or anything else.
  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (body.client === null || typeof body.client === "string") {
    updates.client = typeof body.client === "string" ? body.client.trim() : null;
  }
  if (typeof body.status === "string") updates.status = body.status;
  if (Array.isArray(body.departments)) updates.departments = body.departments;
  if (body.logline === null || typeof body.logline === "string") {
    updates.logline = typeof body.logline === "string" ? body.logline.trim() || null : null;
  }
  if (body.synopsis === null || typeof body.synopsis === "string") {
    updates.synopsis = typeof body.synopsis === "string" ? body.synopsis.trim() || null : null;
  }
  if (body.brief && typeof body.brief === "object" && !Array.isArray(body.brief)) {
    updates.brief = body.brief;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error } = await supabase.from("projects").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase.from("projects").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
