import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Clicking "Review" in the sidebar lands here.
// Rule: always redirect to the most-recently-updated project's review room.
export default async function ReviewIndexPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1. Get projects the user is a member of (separate query — avoids broken inline await)
  const { data: memberRows } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user!.id);

  const memberIds = memberRows?.map(r => r.project_id).filter(Boolean) ?? [];

  // 2. Query owned + member projects, most recently updated first
  const orFilter = memberIds.length > 0
    ? `owner_id.eq.${user!.id},id.in.(${memberIds.join(",")})`
    : `owner_id.eq.${user!.id}`;

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .or(orFilter)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (projects && projects.length > 0) {
    redirect(`/review/${projects[0].id}`);
  }

  // No projects yet — go back to dashboard
  redirect("/dashboard");
}
