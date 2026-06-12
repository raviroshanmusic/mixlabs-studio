import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("review_comments")
    .select("*")
    .eq("project_id", id)
    .order("timecode", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { body, timecode_sec, version_id } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Comment required" }, { status: 400 });

  // Get author name for display
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const authorName = profile?.full_name || profile?.email || user.email || "Unknown";

  const insertData: Record<string, unknown> = {
    project_id: id,
    author_id: user.id,
    author_name: authorName,
    body: body.trim(),
    timecode: timecode_sec ?? null,
    version_id: version_id || null,
    status: "open",
  };

  const { data, error } = await supabase
    .from("review_comments")
    .insert(insertData)
    .select("*")
    .single();

  if (error) {
    // If status or other NOT NULL columns cause issues, retry without them
    if (error.message.includes("status") || error.message.includes("column")) {
      const minimal = { project_id: id, author_id: user.id, author_name: authorName, body: body.trim(), timecode: timecode_sec ?? null };
      const { data: d2, error: e2 } = await supabase.from("review_comments").insert(minimal).select("*").single();
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
      return NextResponse.json(d2);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
