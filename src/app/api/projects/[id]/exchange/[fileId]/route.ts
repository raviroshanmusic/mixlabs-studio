import { deleteFileRecord } from "@/lib/storage-cleanup";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const result = await deleteFileRecord(supabase, id, "project_exchange", fileId, user.id);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("File deletion failed", error);
    return NextResponse.json({ error: "Files could not be fully deleted from storage. Please retry; the item has been kept." }, { status: 502 });
  }
}
