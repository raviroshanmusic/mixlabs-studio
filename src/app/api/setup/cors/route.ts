import { NextResponse } from "next/server";
import { PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { b2, B2_BUCKET } from "@/lib/b2";
import { createClient } from "@/lib/supabase/server";

// One-time endpoint: call GET /api/setup/cors to apply CORS rules to the B2 bucket.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await b2.send(new PutBucketCorsCommand({
    Bucket: B2_BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ["*"],
          AllowedMethods: ["GET", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["Content-Length", "Content-Range", "Accept-Ranges"],
          MaxAgeSeconds: 86400,
        },
      ],
    },
  }));

  return NextResponse.json({ ok: true, message: "CORS rules applied to bucket" });
}
