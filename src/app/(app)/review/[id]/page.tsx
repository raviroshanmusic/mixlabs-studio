import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ReviewClient from "./ReviewClient";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dept?: string }>;
}) {
  const { id } = await params;
  const { dept } = await searchParams;
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
    .not("drive_url", "is", null)
    .order("created_at", { ascending: false });

  const { data: comments } = await supabase
    .from("review_comments")
    .select("*")
    .eq("project_id", id)
    .order("timecode", { ascending: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", user.id)
    .single();

  // Fetch all projects the user owns or is a member of — for the project switcher
  const { data: memberRows } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id);

  const memberIds = memberRows?.map(r => r.project_id) ?? [];

  const { data: allProjects } = await supabase
    .from("projects")
    .select("id, name, status, departments")
    .or(
      memberIds.length > 0
        ? `owner_id.eq.${user.id},id.in.(${memberIds.join(",")})`
        : `owner_id.eq.${user.id}`
    )
    .order("updated_at", { ascending: false });

  return (
    <ReviewClient
      project={{ ...project, departments: project.departments ?? [] }}
      versions={versions ?? []}
      comments={comments ?? []}
      currentUser={{ id: user.id, full_name: profile?.full_name ?? null, email: user.email ?? "" }}
      initialDept={dept ?? null}
      allProjects={allProjects ?? []}
    />
  );
}
