import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2, B2_BUCKET } from "@/lib/b2";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return new NextResponse("Missing key", { status: 400 });

  try {
    const command = new GetObjectCommand({ Bucket: B2_BUCKET, Key: key });
    const url = await getSignedUrl(b2, command, { expiresIn: 3600 });
    // Redirect browser directly to B2 — avoids proxying large files through Vercel
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("B2 sign error:", err);
    return new NextResponse("Failed to generate media URL", { status: 500 });
  }
}
