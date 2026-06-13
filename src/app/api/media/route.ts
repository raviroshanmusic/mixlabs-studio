import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2, B2_BUCKET } from "@/lib/b2";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return new NextResponse("Missing key", { status: 400 });

  // Get a short-lived signed URL from B2
  const command = new GetObjectCommand({ Bucket: B2_BUCKET, Key: key });
  const signedUrl = await getSignedUrl(b2, command, { expiresIn: 300 });

  // Forward the request to B2, passing through Range header for video seeking
  const headers: HeadersInit = {};
  const range = req.headers.get("range");
  if (range) headers["Range"] = range;

  const b2Res = await fetch(signedUrl, { headers });

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", b2Res.headers.get("Content-Type") ?? "video/mp4");
  responseHeaders.set("Accept-Ranges", "bytes");
  responseHeaders.set("Cache-Control", "private, max-age=3600");
  const contentLength = b2Res.headers.get("Content-Length");
  if (contentLength) responseHeaders.set("Content-Length", contentLength);
  const contentRange = b2Res.headers.get("Content-Range");
  if (contentRange) responseHeaders.set("Content-Range", contentRange);

  return new NextResponse(b2Res.body, {
    status: b2Res.status,
    headers: responseHeaders,
  });
}
