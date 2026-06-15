import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type NotificationItem = {
  id: string;
  type: "comment" | "version" | "mention";
  actor: string;
  projectId: string;
  projectName: string;
  body: string;
  timecode: number | null;
  createdAt: string;
  unread: boolean;
};

// GET /api/notifications
// Derives a notification feed from recent activity on projects the user owns or
// belongs to - new review comments and new versions created by *other* people.
// Read state is tracked by profiles.notifications_last_read_at.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Notification preferences + last-read marker (degrade gracefully if columns absent)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, notify_new_comment, notify_new_version, notify_mention, notifications_last_read_at")
    .eq("id", user.id)
    .single();

  const wantComment = profile?.notify_new_comment ?? true;
  const wantVersion = profile?.notify_new_version ?? true;
  const wantMention = profile?.notify_mention ?? true;
  const lastRead = profile?.notifications_last_read_at ? new Date(profile.notifications_last_read_at).getTime() : 0;
  const myName = (profile?.full_name ?? "").trim().toLowerCase();

  // Projects the user can see: owned + member-of
  const [{ data: owned }, { data: memberRows }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("owner_id", user.id),
    supabase.from("project_members").select("project_id").eq("user_id", user.id),
  ]);

  const memberIds = (memberRows ?? []).map(r => r.project_id);
  const { data: memberProjects } = memberIds.length
    ? await supabase.from("projects").select("id, name").in("id", memberIds)
    : { data: [] as { id: string; name: string }[] };

  const projectMap = new Map<string, string>();
  for (const p of [...(owned ?? []), ...(memberProjects ?? [])]) projectMap.set(p.id, p.name);
  const projectIds = [...projectMap.keys()];

  if (projectIds.length === 0) return NextResponse.json({ items: [], unreadCount: 0 });

  // Recent activity by other people on those projects
  const [{ data: comments }, { data: versions }] = await Promise.all([
    supabase
      .from("review_comments")
      .select("id, body, created_at, project_id, timecode, author_id, author_name")
      .in("project_id", projectIds)
      .neq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("project_versions")
      .select("id, version_name, department, created_at, project_id, created_by")
      .in("project_id", projectIds)
      .neq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const items: NotificationItem[] = [];

  for (const c of comments ?? []) {
    const mentioned = myName.length > 2 && (c.body ?? "").toLowerCase().includes(myName);
    if (mentioned ? !wantMention : !wantComment) continue;
    items.push({
      id: `c_${c.id}`,
      type: mentioned ? "mention" : "comment",
      actor: c.author_name || "Someone",
      projectId: c.project_id,
      projectName: projectMap.get(c.project_id) ?? "Unknown",
      body: c.body ?? "",
      timecode: c.timecode ?? null,
      createdAt: c.created_at,
      unread: new Date(c.created_at).getTime() > lastRead,
    });
  }

  if (wantVersion) {
    for (const v of versions ?? []) {
      items.push({
        id: `v_${v.id}`,
        type: "version",
        actor: "A collaborator",
        projectId: v.project_id,
        projectName: projectMap.get(v.project_id) ?? "Unknown",
        body: `${v.version_name || "New version"}${v.department ? ` · ${v.department}` : ""}`,
        timecode: null,
        createdAt: v.created_at,
        unread: new Date(v.created_at).getTime() > lastRead,
      });
    }
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const top = items.slice(0, 25);
  const unreadCount = top.filter(i => i.unread).length;

  return NextResponse.json({ items: top, unreadCount });
}

// POST /api/notifications  → mark everything as read (stamps last-read = now)
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase
    .from("profiles")
    .update({ notifications_last_read_at: new Date().toISOString() })
    .eq("id", user.id);

  // A missing column means the migration hasn't run yet - report it so the UI can hint.
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
