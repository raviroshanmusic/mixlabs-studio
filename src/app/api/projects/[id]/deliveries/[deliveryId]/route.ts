import { deleteFileRecord } from "@/lib/storage-cleanup";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; deliveryId: string }> }
) {
  const { id, deliveryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const allowed = ["title", "department", "notes", "links", "status", "delivered_at"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) update[k] = body[k];
  }

  // Auto-set delivered_at when status → sent
  if (update.status === "sent" && !update.delivered_at) {
    update.delivered_at = new Date().toISOString();
    update.delivered_by = user.id;
  }
  // Clear delivered_at if reverted to preparing
  if (update.status === "preparing") {
    update.delivered_at = null;
    update.delivered_by = null;
  }

  const { data, error } = await supabase
    .from("project_deliveries")
    .update(update)
    .eq("id", deliveryId)
    .eq("project_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; deliveryId: string }> }
) {
  const { id, deliveryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const result = await deleteFileRecord(supabase, id, "project_deliveries", deliveryId, user.id);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("File deletion failed", error);
    return NextResponse.json({ error: "Files could not be fully deleted from storage. Please retry; the item has been kept." }, { status: 502 });
  }
}
