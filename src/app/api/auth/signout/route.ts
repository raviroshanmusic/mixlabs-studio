import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // ?scope=global revokes every active session on all devices.
  const scope = req.nextUrl.searchParams.get("scope") === "global" ? "global" : "local";
  await supabase.auth.signOut({ scope });

  return NextResponse.json({ ok: true });
}
