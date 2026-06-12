import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = "https://vjvhbukbqklgrllwiliv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdmhidWticWtsZ3JsbHdpbGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMzE0MjgsImV4cCI6MjA5NjcwNzQyOH0.NlOUslZynlqSgwOSK6wMm_Yi9qeCRx6S3w2Kkaf9Jus";

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll() {},
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  return NextResponse.json({
    cookieNames: allCookies.map(c => c.name),
    ssrUser: user?.email ?? null,
    ssrError: error?.message ?? null,
  });
}
