import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { status } = await request.json();
  if (!["open", "resolved"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Update without .single() so RLS block doesn't throw — we check count instead
  const { data, error } = await supabase
    .from("review_comments")
    .update({ status })
    .eq("id", commentId)
    .eq("project_id", id)
    .select("id, status");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If no rows updated — likely RLS blocked it. Try as author fallback.
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Permission denied — you may not have access to update this comment. Ask the project owner to run the RLS fix in Supabase." },
      { status: 403 }
    );
  }

  return NextResponse.json(data[0]);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase
    .from("review_comments")
    .delete()
    .eq("id", commentId)
    .eq("project_id", id)
    .eq("author_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
