import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2, B2_BUCKET } from "@/lib/b2";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType, projectId } = await req.json();
  if (!filename || !contentType || !projectId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Store under project folder with timestamp to avoid collisions
  const ext = filename.split(".").pop();
  const key = `projects/${projectId}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

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
