import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2, B2_BUCKET } from "@/lib/b2";
import { createClient } from "@/lib/supabase/server";

// Stream media from B2 through our server — avoids all CORS issues.
// The browser never talks to B2 directly.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return new NextResponse("Missing key", { status: 400 });

  let signedUrl: string;
  try {
    const command = new GetObjectCommand({ Bucket: B2_BUCKET, Key: key });
    signedUrl = await getSignedUrl(b2, command, { expiresIn: 3600 });
  } catch (err) {
    console.error("[media] sign error:", err);
    return new NextResponse("Failed to sign URL", { status: 500 });
  }

  // Forward Range header so video seeking works
  const reqHeaders: Record<string, string> = {};
  const range = req.headers.get("range");
  if (range) reqHeaders["Range"] = range;

  let b2Res: Response;
  try {
    b2Res = await fetch(signedUrl, { headers: reqHeaders });
  } catch (err) {
    console.error("[media] B2 fetch error:", err);
    return new NextResponse("Failed to fetch from storage", { status: 502 });
  }

  if (!b2Res.ok && b2Res.status !== 206) {
    const body = await b2Res.text();
    console.error("[media] B2 error response:", b2Res.status, body);
    return new NextResponse(`B2 ${b2Res.status}: ${body}`, { status: 502 });
  }

  const resHeaders = new Headers();
  resHeaders.set("Content-Type", b2Res.headers.get("Content-Type") ?? "video/mp4");
  resHeaders.set("Accept-Ranges", "bytes");
  resHeaders.set("Cache-Control", "private, max-age=300");
  const cl = b2Res.headers.get("Content-Length");
  if (cl) resHeaders.set("Content-Length", cl);
  const cr = b2Res.headers.get("Content-Range");
  if (cr) resHeaders.set("Content-Range", cr);

  return new NextResponse(b2Res.body, {
    status: b2Res.status,
    headers: resHeaders,
  });
}
