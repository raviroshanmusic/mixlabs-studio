import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2, B2_BUCKET } from "@/lib/b2";
import { createClient } from "@/lib/supabase/server";
import { canAccessKey } from "@/lib/access";

// Only these media types may be uploaded. Anything else (HTML, SVG, scripts)
// could be served back and executed in a victim's browser, so reject it here.
const ALLOWED_CONTENT_TYPES = [
  "video/mp4", "video/quicktime", "video/webm", "video/x-matroska",
  "audio/mpeg", "audio/wav", "audio/x-wav", "audio/aac", "audio/flac", "audio/ogg", "audio/mp4",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "application/zip",
];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType, projectId } = await req.json();
  if (!filename || !contentType || !projectId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  // Store under project folder with timestamp to avoid collisions
  const key = `projects/${projectId}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  // B2 is outside RLS - confirm the caller can actually write to this project
  // before handing out a signed PUT URL for its folder.
  if (!(await canAccessKey(supabase, user, key, "write"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const command = new PutObjectCommand({
    Bucket: B2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(b2, command, { expiresIn: 3600 });

  // The final URL where the file will be accessible (via signed URL for private bucket)
  const fileKey = key;

  return NextResponse.json({ uploadUrl: url, fileKey });
}
