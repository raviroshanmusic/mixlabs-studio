import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Reference / pre-production documents for a project. RLS gates owner-or-member
// access at the DB layer, so we just authenticate and let the policy decide.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("project_documents")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

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
  const { category, title, notes, department, file_key, file_name, file_size, link_url } = body;

  if (!category?.trim()) return NextResponse.json({ error: "Category required" }, { status: 400 });
  if (!title?.trim())    return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!file_key && !link_url) {
    return NextResponse.json({ error: "A file or a link is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("project_documents")
    .insert({
      project_id: id,
      category:   category.trim(),
      title:      title.trim(),
      notes:      notes?.trim() || null,
      department: department?.trim() || null,
      file_key:   file_key || null,
      file_name:  file_name || null,
      file_size:  typeof file_size === "number" ? file_size : null,
      link_url:   link_url?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
