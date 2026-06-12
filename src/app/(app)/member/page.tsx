import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MemberClient from "./MemberClient";

export default async function MemberPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, company")
    .eq("id", user.id)
    .single();

  // Projects owned by user
  const { data: ownedProjects } = await supabase
    .from("projects")
    .select("id, name, client, status, departments")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // Projects user is a member of (not owner)
  const { data: memberRows } = await supabase
    .from("project_members")
    .select("project_id, role, department")
    .eq("user_id", user.id);

  const memberProjectIds = (memberRows ?? []).map(r => r.project_id);

  const { data: memberProjects } = memberProjectIds.length > 0
    ? await supabase
        .from("projects")
        .select("id, name, client, status, departments")
        .in("id", memberProjectIds)
    : { data: [] };

  return (
    <MemberClient
      user={{ id: user.id, email: user.email ?? "" }}
      profile={profile ?? { id: user.id, full_name: null, email: null, company: null }}
      ownedProjects={ownedProjects ?? []}
      memberProjects={memberProjects ?? []}
      memberRows={memberRows ?? []}
    />
  );
}
