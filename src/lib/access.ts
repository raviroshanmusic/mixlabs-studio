import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

// Write access to a project's content (drafts, milestones, documents, deliveries).
//
// This calls the SAME SQL function the RLS policies use, rather than
// reimplementing the rule in TypeScript — so the API layer and the database can
// never drift apart. That drift is exactly what caused the "new row violates
// row-level security policy" bug: the policy gated on project_members.permission
// while the app stored the real value in project_members.role.
//
// RLS is still the actual enforcement boundary. This exists so a blocked user
// gets a clean 403 instead of a raw Postgres error leaking schema details.
//
// Deliberately FAILS OPEN. If the RPC itself errors (e.g. PostgREST hasn't
// reloaded its schema cache and can't see the function yet) we let the request
// proceed to the insert, where RLS makes the real decision and rejects it if
// access is genuinely missing. Failing closed here would turn a transient
// cache miss into a total write outage for every user — strictly worse than
// the error message this function exists to improve.
export async function canEditProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_edit_project", { pid: projectId });
  if (error) {
    console.error("can_edit_project check failed, deferring to RLS:", error.message);
    return true;
  }
  return data === true;
}

// B2 lives outside Postgres RLS, so file-level authorization has to be enforced
// here in the route handlers. Every B2 key belongs to one of two namespaces:
//
//   avatars/{userId}/...      profile pictures
//   projects/{projectId}/...  project media (drafts, deliveries)
//
// canAccessKey parses the owning id out of the key and confirms the caller is
// allowed to touch it. For projects we lean on RLS: an authed user can only
// SELECT a project row if they own it or are a member, so a successful select
// IS the membership check. Anything we don't recognise is denied by default.
export async function canAccessKey(
  supabase: SupabaseClient,
  user: User,
  key: string,
  mode: "read" | "write",
): Promise<boolean> {
  const parts = key.split("/");
  const namespace = parts[0];

  if (namespace === "avatars") {
    const ownerId = parts[1];
    if (!ownerId) return false;
    // Avatars are shown across the app, so any authed user may read them.
    // Writes are restricted to the user's own avatar folder.
    return mode === "read" ? true : ownerId === user.id;
  }

  if (namespace === "projects") {
    const projectId = parts[1];
    if (!projectId) return false;
    // RLS only returns this row if the caller owns or is a member of the
    // project, so a hit here means they're authorized for both read and write.
    const { data } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();
    return !!data;
  }

  return false;
}
