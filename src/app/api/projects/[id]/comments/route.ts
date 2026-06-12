import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("review_comments")
    .select("*, profiles!review_comments_author_id_fkey(id, full_name, email)")
    .eq("project_id", id)
    .order("timecode", { ascending: true });

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

  const { data, error } = await supabase
    .from("review_comments")
    .insert({
      project_id: id,
      version_id: version_id || null,
      author_id: user.id,
      body: body.trim(),
      timecode: timecode_sec ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
