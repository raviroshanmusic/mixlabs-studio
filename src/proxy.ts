import { NextResponse, type NextRequest } from "next/server";

// Middleware stripped down - auth is handled at the page level.
// Each protected page calls supabase.auth.getUser() and redirects if no session.
export async function proxy(request: NextRequest) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
