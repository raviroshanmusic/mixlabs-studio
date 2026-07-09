import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function kindFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["aaf", "omf"].includes(ext)) return "AAF";
  if (["fcpxml", "xml", "otio", "drt"].includes(ext)) return "XML";
  if (["edl", "cdl", "ccc", "ale"].includes(ext)) return "EDL";
  if (["mov", "mp4", "mkv", "webm"].includes(ext)) return "MOV";
  if (["wav", "aif", "aiff", "mp3", "flac"].includes(ext)) return "AUDIO";
  return ext ? ext.toUpperCase() : "FILE";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("project_exchange")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { title, notes, file_key, file_name, file_size } = await req.json();
  if (!file_key || !file_name) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("project_exchange")
    .insert({
      project_id: id,
      title: (title ?? "").trim() || null,
      notes: (notes ?? "").trim() || null,
      kind: kindFromName(file_name),
      file_key,
      file_name,
      file_size: typeof file_size === "number" ? file_size : null,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
