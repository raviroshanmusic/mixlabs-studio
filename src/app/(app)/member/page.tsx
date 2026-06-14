import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MemberClient from "./MemberClient";

export default async function MemberPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, company, profession")
    .eq("id", user.id)
    .single();

  // Extended profile columns (avatar + notification prefs). Fetched separately so a
  // missing column (migration not yet run) degrades gracefully instead of nulling the
  // whole profile. See supabase-migration-member.sql.
  const { data: profileExt } = await supabase
    .from("profiles")
    .select("avatar_url, notify_new_comment, notify_new_version, notify_mention, notify_email_digest")
    .eq("id", user.id)
    .single();

  const notifications = {
    notify_new_comment:  profileExt?.notify_new_comment  ?? true,
    notify_new_version:  profileExt?.notify_new_version  ?? true,
    notify_mention:      profileExt?.notify_mention      ?? true,
    notify_email_digest: profileExt?.notify_email_digest ?? false,
  };

  // Projects owned
  const { data: ownedProjects } = await supabase
    .from("projects")
    .select("id, name, client, status, departments, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  // Projects as member
  const { data: memberRows } = await supabase
    .from("project_members")
    .select("project_id, role, department")
    .eq("user_id", user.id);

  const memberProjectIds = (memberRows ?? []).map(r => r.project_id);
  const { data: memberProjects } = memberProjectIds.length > 0
    ? await supabase
        .from("projects")
        .select("id, name, client, status, departments, created_at, updated_at")
        .in("id", memberProjectIds)
        .order("updated_at", { ascending: false })
    : { data: [] };

  // Activity: recent review comments by this user (deep history for filtering)
  const { data: recentComments } = await supabase
    .from("review_comments")
    .select("id, body, created_at, project_id, timecode")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  // Activity: recent files added by this user
  const { data: recentFiles } = await supabase
    .from("project_versions")
    .select("id, version_name, department, created_at, project_id")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  // Stats
  const totalProjects = (ownedProjects?.length ?? 0) + (memberProjects?.length ?? 0);
  const { count: totalComments } = await supabase
    .from("review_comments")
    .select("id", { count: "exact", head: true })
    .eq("author_id", user.id);
  const { count: totalFiles } = await supabase
    .from("project_versions")
    .select("id", { count: "exact", head: true })
    .eq("created_by", user.id);

  // Enrich comments with project names
  const allProjects = [...(ownedProjects ?? []), ...(memberProjects ?? [])];
  const projectMap = Object.fromEntries(allProjects.map(p => [p.id, p.name]));

  return (
    <MemberClient
      user={{ id: user.id, email: user.email ?? "" }}
      profile={profile ?? { id: user.id, full_name: null, email: null, company: null, profession: null }}
      avatarUrl={profileExt?.avatar_url ?? null}
      notifications={notifications}
      session={{
        lastSignInAt: user.last_sign_in_at ?? null,
        createdAt: user.created_at ?? null,
      }}
      ownedProjects={ownedProjects ?? []}
      memberProjects={memberProjects ?? []}
      memberRows={memberRows ?? []}
      stats={{ projects: totalProjects, comments: totalComments ?? 0, files: totalFiles ?? 0 }}
      recentComments={(recentComments ?? []).map(c => ({ ...c, projectName: projectMap[c.project_id] ?? "Unknown" }))}
      recentFiles={(recentFiles ?? []).map(f => ({ ...f, projectName: projectMap[f.project_id] ?? "Unknown" }))}
    />
  );
}
