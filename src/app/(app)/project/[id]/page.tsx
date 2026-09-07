import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ProjectClient from "./ProjectClient";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) notFound();

  const { data: versions } = await supabase
    .from("project_versions")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  // Fetch members then enrich with profiles separately (user_id → auth.users, not directly joinable)
  const { data: membersRaw } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", id);

  // One query for every profile rather than one per member. The old version
  // fired a round trip per person on every load of this page.
  const memberUserIds = [...new Set((membersRaw ?? []).map(m => m.user_id).filter(Boolean))];
  const { data: profiles } = memberUserIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", memberUserIds)
    : { data: [] };

  const profileById = new Map((profiles ?? []).map(p => [p.id, p]));
  const members = (membersRaw ?? []).map(m => ({
    ...m,
    profiles: profileById.get(m.user_id) ?? null,
  }));

  const { data: milestones } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", id)
    .order("start_date", { ascending: true });

  const { data: deliveries } = await supabase
    .from("project_deliveries")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const { data: documents } = await supabase
    .from("project_documents")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const { data: exchange } = await supabase
    .from("project_exchange")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return (
    <ProjectClient
      project={{ ...project, departments: project.departments ?? [], owner_id: project.owner_id, brief: project.brief ?? {} }}
      versions={versions ?? []}
      members={members ?? []}
      milestones={milestones ?? []}
      deliveries={deliveries ?? []}
      documents={documents ?? []}
      exchange={exchange ?? []}
      currentUserId={user.id}
    />
  );
}
