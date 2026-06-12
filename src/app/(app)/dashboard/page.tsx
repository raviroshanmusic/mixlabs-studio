import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, client, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, company")
    .eq("id", user.id)
    .single();

  return <DashboardClient user={user} projects={projects ?? []} profile={profile} />;
}
