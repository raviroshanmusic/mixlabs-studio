import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vjvhbukbqklgrllwiliv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdmhidWticWtsZ3JsbHdpbGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMzE0MjgsImV4cCI6MjA5NjcwNzQyOH0.NlOUslZynlqSgwOSK6wMm_Yi9qeCRx6S3w2Kkaf9Jus";

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Test 1: Can we reach Supabase at all?
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "rajputraviroshan@gmail.com",
      password: "Mixlabs@2024",
    });

    return NextResponse.json({
      url: SUPABASE_URL,
      keyPrefix: SUPABASE_ANON_KEY.substring(0, 20) + "...",
      loginError: error ? error.message : null,
      loginStatus: error ? "FAILED" : "SUCCESS",
      userId: data?.user?.id ?? null,
      userEmail: data?.user?.email ?? null,
      userConfirmed: data?.user?.email_confirmed_at ?? null,
    });
  } catch (e: unknown) {
    return NextResponse.json({ fatal: String(e) }, { status: 500 });
  }
}
