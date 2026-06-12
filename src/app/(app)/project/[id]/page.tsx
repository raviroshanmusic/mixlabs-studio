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

  const { data: members } = await supabase
    .from("project_members")
    .select("*, profiles(id, full_name, email)")
    .eq("project_id", id);

  return (
    <ProjectClient
      project={project}
      versions={versions ?? []}
      members={members ?? []}
      currentUserId={user.id}
    />
  );
}
