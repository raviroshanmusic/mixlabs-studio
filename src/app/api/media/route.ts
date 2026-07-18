import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2, B2_BUCKET } from "@/lib/b2";
import { createClient } from "@/lib/supabase/server";
import { canAccessKey } from "@/lib/access";

// Authorize the request, then redirect the browser to a short-lived presigned B2
// URL so it streams the file DIRECTLY from Backblaze. B2 handles HTTP Range
// natively, so video seeking/streaming is smooth even for multi-GB files — and
// nothing large ever flows through the Vercel function (which would time out).
//
// Security: the file is served from B2's own domain, not ours, so an uploaded
// file can never execute in our origin. For non-media (documents) and any
// explicit ?download=1 we ask B2 to send it as an attachment.
const INLINE_EXT = new Set([
  "mp4", "mov", "m4v", "webm", "ogg",
  "mp3", "wav", "aac", "m4a", "flac", "aif", "aiff",
  "jpg", "jpeg", "png", "gif", "webp", "pdf",
]);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return new NextResponse("Missing key", { status: 400 });

  if (!(await canAccessKey(supabase, user, key, "read"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const name = (key.split("/").pop() ?? "file").replace(/"/g, "");
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const forceDownload =
    req.nextUrl.searchParams.get("download") === "1" || !INLINE_EXT.has(ext);

  let signedUrl: string;
  try {
    const command = new GetObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      ...(forceDownload
        ? { ResponseContentDisposition: `attachment; filename="${name}"` }
        : {}),
    });
    signedUrl = await getSignedUrl(b2, command, { expiresIn: 3600 });
  } catch (err) {
    console.error("[media] sign error:", err);
    return new NextResponse("Failed to sign URL", { status: 500 });
  }

  return NextResponse.redirect(signedUrl, 302);
}
