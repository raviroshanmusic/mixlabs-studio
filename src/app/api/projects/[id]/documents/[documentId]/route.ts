import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id, documentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Whitelist editable fields - never spread the raw body.
  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string")    updates.title = body.title.trim();
  if (typeof body.category === "string") updates.category = body.category.trim();
  if (body.notes === null || typeof body.notes === "string") {
    updates.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  }
  if (body.department === null || typeof body.department === "string") {
    updates.department = typeof body.department === "string" ? body.department.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("project_documents")
    .update(updates)
    .eq("id", documentId)
    .eq("project_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id, documentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase
    .from("project_documents")
    .delete()
    .eq("id", documentId)
    .eq("project_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
