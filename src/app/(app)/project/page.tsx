import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Clicking "Projects" in the sidebar lands here. Jump straight into the user's
// most-recent project workspace. If they have none, fall back to the dashboard.
// Having this page also means /project is never a 404 for direct visits/bookmarks.
export default async function ProjectIndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id);
  const memberIds = memberRows?.map(r => r.project_id) ?? [];

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .or(
      memberIds.length > 0
        ? `owner_id.eq.${user.id},id.in.(${memberIds.join(",")})`
        : `owner_id.eq.${user.id}`,
    )
    .order("updated_at", { ascending: false })
    .limit(1);

  if (projects && projects[0]) redirect(`/project/${projects[0].id}`);
  redirect("/dashboard");
}
