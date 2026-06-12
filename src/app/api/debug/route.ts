import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = "https://vjvhbukbqklgrllwiliv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdmhidWticWtsZ3JsbHdpbGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMzE0MjgsImV4cCI6MjA5NjcwNzQyOH0.NlOUslZynlqSgwOSK6wMm_Yi9qeCRx6S3w2Kkaf9Jus";

export async function GET(request: NextRequest) {
  // 1. What cookies does the server see?
  const allCookies = request.cookies.getAll();

  // 2. Can raw supabase-js login? (already confirmed yes)
  const raw = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: loginData, error: loginError } = await raw.auth.signInWithPassword({
    email: "rajputraviroshan@gmail.com",
    password: "Mixlabs@2024",
  });

  // 3. Can the SSR server client see a session from the request cookies?
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll() {},
    },
  });
  const { data: { user: ssrUser }, error: ssrError } = await supabase.auth.getUser();

  return NextResponse.json({
    // What cookies the server received
    cookiesReceived: allCookies.map(c => c.name),
    supabaseCookies: allCookies.filter(c => c.name.startsWith("sb-")),

    // Direct login works?
    directLoginStatus: loginError ? "FAILED: " + loginError.message : "SUCCESS",
    directUserId: loginData?.user?.id ?? null,

    // SSR session from cookies?
    ssrSessionUser: ssrUser?.email ?? null,
    ssrError: ssrError?.message ?? null,
  });
}
