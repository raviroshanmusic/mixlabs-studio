import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: projects },
    { data: allMembers },
    { data: allVersions },
    { data: recentComments },
    { data: recentFiles },
  ] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, company").eq("id", user.id).single(),
    supabase.from("projects").select("id, name, client, status, departments, created_at, updated_at").order("updated_at", { ascending: false }),
    supabase.from("project_members").select("project_id"),
    supabase.from("project_versions").select("project_id, created_at"),
    supabase.from("review_comments").select("id, body, project_id, author_name, created_at, timecode").order("created_at", { ascending: false }).limit(12),
    supabase.from("project_versions").select("id, version_name, department, project_id, created_at").order("created_at", { ascending: false }).limit(12),
  ]);

  // Build per-project counts
  const memberCount: Record<string, number> = {};
  const fileCount: Record<string, number> = {};
  (allMembers ?? []).forEach(r => { memberCount[r.project_id] = (memberCount[r.project_id] ?? 0) + 1; });
  (allVersions ?? []).forEach(r => { fileCount[r.project_id] = (fileCount[r.project_id] ?? 0) + 1; });

  const projectList = (projects ?? []).map(p => ({
    ...p,
    departments: p.departments ?? [],
    memberCount: memberCount[p.id] ?? 0,
    fileCount: fileCount[p.id] ?? 0,
  }));

  // Enrich activity with project names
  const projectMap = Object.fromEntries((projects ?? []).map(p => [p.id, p.name]));

  const activity = [
    ...(recentComments ?? []).map(c => ({
      id: c.id, type: "comment" as const,
      text: c.body, author: c.author_name ?? "Someone",
      projectId: c.project_id, projectName: projectMap[c.project_id] ?? "Unknown",
      date: c.created_at, timecode: c.timecode,
    })),
    ...(recentFiles ?? []).map(f => ({
      id: f.id, type: "file" as const,
      text: f.version_name, author: "",
      projectId: f.project_id, projectName: projectMap[f.project_id] ?? "Unknown",
      date: f.created_at, timecode: null,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  const stats = {
    active:   projectList.filter(p => p.status === "active").length,
    inReview: projectList.filter(p => p.status === "in review").length,
    delivered: projectList.filter(p => p.status === "delivered").length,
    total: projectList.length,
  };

  return (
    <DashboardClient
      user={user}
      profile={profile ?? null}
      projects={projectList}
      activity={activity}
      stats={stats}
    />
  );
}
