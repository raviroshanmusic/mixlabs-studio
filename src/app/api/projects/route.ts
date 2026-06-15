import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isStaffEmail } from "@/lib/staff";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Internal tool: only MixLabs staff may create projects. Clients are invited
  // into existing ones. UI hides the button, but this is the real gate.
  if (!isStaffEmail(user.email)) {
    return NextResponse.json({ error: "Only MixLabs staff can create projects" }, { status: 403 });
  }

  const { name, client, departments } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const { data, error } = await supabase
    .from("projects")
    .insert({ name: name.trim(), client: client?.trim() || "", status: "active", owner_id: user.id, departments: departments ?? [] })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
