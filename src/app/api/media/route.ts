import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2, B2_BUCKET } from "@/lib/b2";
import { createClient } from "@/lib/supabase/server";
import { canAccessKey } from "@/lib/access";

// Stream media from B2 through our server - avoids all CORS issues.
// The browser never talks to B2 directly.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return new NextResponse("Missing key", { status: 400 });

  if (!(await canAccessKey(supabase, user, key, "read"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

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
    return new NextResponse("Failed to fetch media", { status: 502 });
  }

  if (!b2Res.ok && b2Res.status !== 206) {
    const body = await b2Res.text();
    console.error("[media] B2 error response:", b2Res.status, body);
    const status = b2Res.status === 404 ? 404 : 502;
    return new NextResponse(b2Res.status === 404 ? "Media not found" : "Failed to fetch media", { status });
  }

  const resHeaders = new Headers();
  const contentType = b2Res.headers.get("Content-Type") ?? "video/mp4";
  resHeaders.set("Content-Type", contentType);
  resHeaders.set("Accept-Ranges", "bytes");

  // Defence in depth for the document library: only audio/video/images/PDFs are
  // safe to render inline. Anything else (and any explicit ?download=1) is forced
  // to download with nosniff, so an uploaded .html/.svg can never execute in our
  // origin even if it slipped past the upload allowlist.
  resHeaders.set("X-Content-Type-Options", "nosniff");
  const inlineSafe =
    /^(audio|video)\//.test(contentType) ||
    (contentType.startsWith("image/") && contentType !== "image/svg+xml") ||
    contentType === "application/pdf";
  const forceDownload = req.nextUrl.searchParams.get("download") === "1";
  if (!inlineSafe || forceDownload) {
    const name = (key.split("/").pop() ?? "file").replace(/"/g, "");
    resHeaders.set("Content-Disposition", `attachment; filename="${name}"`);
  }
  // B2 keys are content-addressed (avatars/{id}/{ts}.ext, immutable version objects),
  // so a given URL never changes bytes. Cache hard in the browser to stop re-downloading
  // the same media from B2 on every replay/seek - the main driver of the daily bandwidth cap.
  // `private` keeps it per-user (media is auth-gated) and out of any shared/CDN cache.
  resHeaders.set("Cache-Control", "private, max-age=31536000, immutable");
  const cl = b2Res.headers.get("Content-Length");
  if (cl) resHeaders.set("Content-Length", cl);
  const cr = b2Res.headers.get("Content-Range");
  if (cr) resHeaders.set("Content-Range", cr);

  return new NextResponse(b2Res.body, {
    status: b2Res.status,
    headers: resHeaders,
  });
}
