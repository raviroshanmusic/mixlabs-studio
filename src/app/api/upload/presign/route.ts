import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2, B2_BUCKET } from "@/lib/b2";
import { createClient } from "@/lib/supabase/server";
import { canAccessKey } from "@/lib/access";

// Media + document/turnover formats a post house actually handles.
const ALLOWED_CONTENT_TYPES = new Set([
  // Picture / sound media
  "video/mp4", "video/quicktime", "video/webm", "video/x-matroska",
  "audio/mpeg", "audio/wav", "audio/x-wav", "audio/aac", "audio/flac", "audio/ogg", "audio/mp4", "audio/aiff", "audio/x-aiff",
  // Images (mood boards, stills)
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/tiff", "image/heic",
  // Documents
  "application/pdf", "application/zip", "application/x-zip-compressed",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/rtf", "application/rtf",
  "application/xml", "text/xml",
]);

// Turnover/post formats often arrive as octet-stream or an empty type (.edl,
// .aaf, .fcpxml, .fdx, etc). When the MIME type isn't recognised we fall back
// to this extension allowlist instead of rejecting the upload.
const ALLOWED_EXTENSIONS = new Set([
  "edl", "aaf", "omf", "fcpxml", "xml", "otio", "drt", "ale", "cdl", "ccc",
  "fdx", "fountain", "txt", "csv", "rtf",
  "pdf", "zip", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "pages", "key", "numbers",
  "jpg", "jpeg", "png", "gif", "webp", "tif", "tiff", "heic",
  "mp4", "mov", "mkv", "webm", "mp3", "wav", "aif", "aiff", "flac", "ogg", "m4a", "aac",
]);

// Never allow active markup/scripts to land in the bucket - they could be
// served back and execute in our origin even with the safeguards downstream.
const DANGEROUS_EXTENSIONS = new Set([
  "html", "htm", "xhtml", "shtml", "svg", "js", "mjs", "jsx", "php", "phtml",
  "sh", "bash", "command", "exe", "bat", "cmd", "com", "scr", "vbs", "jar", "htaccess",
]);

function isUploadAllowed(filename: string, contentType: string): boolean {
  const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
  if (DANGEROUS_EXTENSIONS.has(ext)) return false;
  if (ALLOWED_CONTENT_TYPES.has(contentType)) return true;
  // Unknown / generic MIME (e.g. application/octet-stream) - judge by extension.
  return ALLOWED_EXTENSIONS.has(ext);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType, projectId, folder } = await req.json();
  if (!filename || !contentType || !projectId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!isUploadAllowed(filename, contentType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  // Optional sub-folder (e.g. "docs"), sanitised to a single safe segment.
  const safeFolder = typeof folder === "string" ? folder.replace(/[^a-zA-Z0-9_-]/g, "") : "";
  const prefix = safeFolder ? `projects/${projectId}/${safeFolder}` : `projects/${projectId}`;

  // Store under project folder with timestamp to avoid collisions
  const key = `${prefix}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

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
