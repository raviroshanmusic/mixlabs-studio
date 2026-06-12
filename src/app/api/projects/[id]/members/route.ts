import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { email, role } = await request.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Look up profile by email
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("email", email.trim())
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "No user found with that email address" }, { status: 404 });
  }

  // Add to project_members
  const { data: member, error } = await supabase
    .from("project_members")
    .insert({ project_id: id, user_id: profile.id, role: role || "viewer" })
    .select("*, profiles(id, full_name, email)")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Member already added" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member });
}
