import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { email, role } = await request.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Look up user ID by email via RPC (profiles.email may be null, so we check auth.users)
  const { data: userId, error: rpcError } = await supabase
    .rpc("get_user_id_by_email", { email_input: email.trim().toLowerCase() });

  if (rpcError || !userId) {
    // Fallback: try profiles table directly
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .or(`email.eq.${email.trim()},email.eq.${email.trim().toLowerCase()}`)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "No user found with that email. They must sign up first." },
        { status: 404 }
      );
    }

    const { data: member, error } = await supabase
      .from("project_members")
      .insert({ project_id: id, user_id: profile.id, role: role || "viewer" })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Member already added" }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ member: { ...member, profiles: profile } });
  }

  // Insert using the resolved user ID
  const { data: member, error } = await supabase
    .from("project_members")
    .insert({ project_id: id, user_id: userId, role: role || "viewer" })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Member already added" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch profile separately (user_id → auth.users, not directly joinable to profiles)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", userId)
    .single();

  return NextResponse.json({ member: { ...member, profiles: profile ?? null } });
}
