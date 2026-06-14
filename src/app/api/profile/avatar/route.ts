import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { b2, B2_BUCKET } from "@/lib/b2";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Upload a profile photo to B2 and store its key on the profile.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Use a JPG, PNG, WEBP or GIF image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
  }

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const key = `avatars/${user.id}/${Date.now()}.${ext}`;

  // Remove the previous avatar object so we don't leak orphans in the bucket.
  const { data: prev } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await b2.send(new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));
  } catch (err) {
    console.error("[avatar] upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 502 });
  }

  const { error } = await supabase.from("profiles").update({ avatar_url: key }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (prev?.avatar_url && prev.avatar_url !== key) {
    try { await b2.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: prev.avatar_url })); }
    catch (err) { console.error("[avatar] cleanup error:", err); }
  }

  return NextResponse.json({ ok: true, key });
}

// Remove the profile photo (revert to initials avatar).
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prev } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();

  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (prev?.avatar_url) {
    try { await b2.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: prev.avatar_url })); }
    catch (err) { console.error("[avatar] delete error:", err); }
  }

  return NextResponse.json({ ok: true });
}
