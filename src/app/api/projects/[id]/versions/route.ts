import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyNewVersion } from "@/lib/email";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { title, department, drive_url } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!department?.trim()) return NextResponse.json({ error: "Department required" }, { status: 400 });

  const { data, error } = await supabase
    .from("project_versions")
    .insert({
      project_id: id,
      version_name: title.trim(),
      department: department.trim(),
      drive_url: drive_url?.trim() || null,
      created_by: user.id,
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the rest of the project by email (best-effort — never blocks the upload).
  try {
    await notifyNewVersion(supabase, {
      projectId: id, actorId: user.id,
      department: department.trim(), versionName: title.trim(),
    });
  } catch (e) { console.error("notifyNewVersion failed:", e); }

  return NextResponse.json(data);
}
