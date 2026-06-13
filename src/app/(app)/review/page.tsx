import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Clicking "Review" in the sidebar lands here.
// Rule: always redirect to the most-recently-updated project's review room.
export default async function ReviewIndexPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all projects, most recently updated first
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .or(`owner_id.eq.${user.id},id.in.(${
      // also include projects the user is a member of
      (await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id)
      ).data?.map(r => r.project_id).join(",") || "null"
    })`)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (projects && projects.length > 0) {
    redirect(`/review/${projects[0].id}`);
  }

  // No projects yet — go back to dashboard
  redirect("/dashboard");
}
