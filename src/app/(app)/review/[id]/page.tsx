import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ReviewClient from "./ReviewClient";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
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
    .not("drive_url", "is", null)
    .order("created_at", { ascending: false });

  const { data: comments } = await supabase
    .from("review_comments")
    .select("*, profiles(id, full_name, email)")
    .eq("project_id", id)
    .order("timecode_sec", { ascending: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", user.id)
    .single();

  return (
    <ReviewClient
      project={{ ...project, departments: project.departments ?? [] }}
      versions={versions ?? []}
      comments={comments ?? []}
      currentUser={{ id: user.id, full_name: profile?.full_name ?? null, email: user.email ?? "" }}
    />
  );
}
