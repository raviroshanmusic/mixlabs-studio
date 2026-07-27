import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyProjectInvite } from "@/lib/email";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Only the project owner may invite. Explicit check (defense-in-depth alongside
  // the RLS insert policy) that also stops non-owners from using this endpoint to
  // probe whether an email has an account (enumeration).
  const { data: owned } = await supabase
    .from("projects").select("id").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!owned) return NextResponse.json({ error: "Only the project owner can add members" }, { status: 403 });

  const { email, role } = await request.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();

  // Already on this project? (covers pending invites too, which have no user_id)
  const { data: existing } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", id)
    .ilike("email", normalizedEmail)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "Member already added" }, { status: 409 });

  // Resolve the invitee. They may not have an account yet — that's fine, we store
  // a pending row and the signup trigger claims it when they register.
  let resolvedUserId: string | null = null;
  let resolvedFullName: string | null = null;

  const { data: rpcId } = await supabase.rpc("get_user_id_by_email", { email_input: normalizedEmail });
  if (rpcId) {
    resolvedUserId = rpcId;
    const { data: profile } = await supabase
      .from("profiles").select("full_name").eq("id", rpcId).maybeSingle();
    resolvedFullName = profile?.full_name ?? null;
  } else {
    const { data: profile } = await supabase
      .from("profiles").select("id, full_name").eq("email", normalizedEmail).maybeSingle();
    if (profile) {
      resolvedUserId = profile.id;
      resolvedFullName = profile.full_name ?? null;
    }
  }

  const isNewUser = !resolvedUserId;

  const { data: member, error } = await supabase
    .from("project_members")
    .insert({
      project_id: id,
      user_id: resolvedUserId,               // null = pending until they sign up
      email: normalizedEmail,
      full_name: resolvedFullName,
      // `role` is the access level (viewer/editor/admin). It drives the UI and,
      // since supabase-migration-role-rls.sql, the RLS policies too. The old
      // `permission` column is no longer written here — it now has a DB default.
      role: role || "viewer",
      department: "all",
      status: isNewUser ? "pending" : "active",
      invited_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Member already added" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Invite email (best-effort — never fails the request).
  try {
    await notifyProjectInvite(supabase, {
      projectId: id, email: normalizedEmail, inviterId: user.id, isNewUser,
    });
  } catch (e) { console.error("notifyProjectInvite failed:", e); }

  return NextResponse.json({
    member: {
      ...member,
      profiles: resolvedUserId
        ? { id: resolvedUserId, full_name: resolvedFullName, email: normalizedEmail }
        : null,
    },
    pending: isNewUser,
  });
}
