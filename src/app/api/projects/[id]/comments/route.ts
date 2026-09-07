import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyMention } from "@/lib/email";

// Supports an incremental read: ?since=<ISO timestamp> returns only comments
// created after that moment.
//
// The review room polls this. Without `since` it returned every comment on the
// project, with full bodies, every 45 seconds — the single largest source of
// Supabase egress in the app, almost all of it re-sending text the client
// already had. With it, a poll on a quiet project returns an empty array.
//
// Deliberately doesn't catch edits or deletions; the client does a full read on
// mount and when the tab regains focus, which covers those.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const since = req.nextUrl.searchParams.get("since");
  let query = supabase
    .from("review_comments")
    .select("*")
    .eq("project_id", id);

  // Reject anything that isn't a real timestamp rather than handing Postgres
  // something it will only complain about opaquely.
  if (since && !Number.isNaN(Date.parse(since))) {
    query = query.gt("created_at", new Date(since).toISOString());
  }

  const { data, error } = await query
    .order("timecode", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { body, timecode_sec, version_id, mentions } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Comment required" }, { status: 400 });

  // Get author display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();
  const authorName = profile?.full_name || profile?.email || user.email || "Unknown";

  // Look up version details to satisfy NOT NULL constraints
  let department = "General";
  let versionName = "Review";
  if (version_id) {
    const { data: version } = await supabase
      .from("project_versions")
      .select("department, version_name")
      .eq("id", version_id)
      .single();
    if (version) {
      department = version.department || "General";
      versionName = version.version_name || "Review";
    }
  }

  const { data, error } = await supabase
    .from("review_comments")
    .insert({
      project_id: id,
      version_id: version_id || null,
      author_id: user.id,
      author_name: authorName,
      body: body.trim(),
      timecode: timecode_sec ?? null,
      department,
      version_name: versionName,
      status: "open",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Broadcast per-comment emails stay OFF (too noisy). But @mentions are targeted,
  // so we DO email the specific people who were mentioned (best-effort).
  if (Array.isArray(mentions) && mentions.length) {
    try {
      await notifyMention(supabase, {
        projectId: id, actorId: user.id,
        mentionedUserIds: mentions, versionName, department, body: body.trim(),
      });
    } catch (e) { console.error("notifyMention failed:", e); }
  }

  return NextResponse.json(data);
}
