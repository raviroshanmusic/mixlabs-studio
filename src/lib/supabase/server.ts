import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseFetch } from "@/lib/supabaseFetch";

const SUPABASE_URL = "https://vjvhbukbqklgrllwiliv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdmhidWticWtsZ3JsbHdpbGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMzE0MjgsImV4cCI6MjA5NjcwNzQyOH0.NlOUslZynlqSgwOSK6wMm_Yi9qeCRx6S3w2Kkaf9Jus";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Every server-side read in the app goes through here, so the retry
    // belongs here too — not just on the two auth routes.
    global: { fetch: supabaseFetch },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {}
      },
    },
  });
}
