import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", id)
    .order("start_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { title, department, start_date, end_date, status, linked_version_id } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!start_date || !end_date) return NextResponse.json({ error: "Dates required" }, { status: 400 });
  if (new Date(end_date) < new Date(start_date)) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  const progress = Math.max(0, Math.min(100, Math.round(Number(body.progress) || 0)));

  const { data, error } = await supabase
    .from("project_milestones")
    .insert({
      project_id: id,
      title: title.trim(),
      department: department || null,
      start_date,
      end_date,
      status: status || "planned",
      progress,
      linked_version_id: linked_version_id || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
