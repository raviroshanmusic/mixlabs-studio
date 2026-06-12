import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { email, role } = await request.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();

  // Try RPC first (looks up auth.users by email)
  let resolvedUserId: string | null = null;
  let resolvedFullName: string | null = null;
  let resolvedEmail = normalizedEmail;

  const { data: rpcId } = await supabase.rpc("get_user_id_by_email", { email_input: normalizedEmail });
  if (rpcId) {
    resolvedUserId = rpcId;
    // Try to get display name from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", rpcId)
      .single();
    resolvedFullName = profile?.full_name ?? null;
    resolvedEmail = profile?.email || normalizedEmail;
  } else {
    // Fallback: search profiles by email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", normalizedEmail)
      .single();
    if (!profile) {
      return NextResponse.json(
        { error: "No user found with that email. They need to sign up first." },
        { status: 404 }
      );
    }
    resolvedUserId = profile.id;
    resolvedFullName = profile.full_name ?? null;
    resolvedEmail = profile.email || normalizedEmail;
  }

  const { data: member, error } = await supabase
    .from("project_members")
    .insert({
      project_id: id,
      user_id: resolvedUserId,
      email: resolvedEmail,
      full_name: resolvedFullName,
      role: role || "viewer",
      department: "all",
      permission: "view",
      status: "active",
      invited_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Member already added" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    member: {
      ...member,
      profiles: { id: resolvedUserId, full_name: resolvedFullName, email: resolvedEmail },
    },
  });
}
