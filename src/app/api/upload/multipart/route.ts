import { NextRequest, NextResponse } from "next/server";
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2, B2_BUCKET } from "@/lib/b2";
import { createClient } from "@/lib/supabase/server";
import { canAccessKey } from "@/lib/access";
import { SIGN_BATCH, type UploadedPart } from "@/lib/multipart";

// Multipart upload, for files past the 5GB single-PUT ceiling.
//
// Four actions on one route so authorization is written once: every action
// re-checks canAccessKey against the key, because the key arrives from the
// client on each call and an uploadId alone proves nothing about who owns it.
//
// Nothing streams through this function — the browser PUTs each part straight
// to B2 with a presigned URL, exactly like the single-part path. Vercel only
// ever sees small JSON.

type Action = "create" | "sign" | "complete" | "abort";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = body.action as Action;
  const key = typeof body.key === "string" ? body.key : "";

  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  // B2 sits outside Postgres RLS, so writes have to be authorized here. Checked
  // on every action, not just create.
  if (!(await canAccessKey(supabase, user, key, "write"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    switch (action) {
      case "create": {
        const contentType = typeof body.contentType === "string" && body.contentType
          ? body.contentType
          : "application/octet-stream";

        const out = await b2.send(new CreateMultipartUploadCommand({
          Bucket: B2_BUCKET,
          Key: key,
          ContentType: contentType,
        }));

        if (!out.UploadId) throw new Error("B2 did not return an upload id");
        return NextResponse.json({ uploadId: out.UploadId, key });
      }

      case "sign": {
        const uploadId = String(body.uploadId ?? "");
        const parts: number[] = Array.isArray(body.partNumbers)
          ? body.partNumbers.filter((n: unknown) => Number.isInteger(n) && (n as number) > 0)
          : [];

        if (!uploadId) return NextResponse.json({ error: "Missing uploadId" }, { status: 400 });
        if (!parts.length) return NextResponse.json({ error: "No parts to sign" }, { status: 400 });
        if (parts.length > SIGN_BATCH) {
          return NextResponse.json({ error: `Sign at most ${SIGN_BATCH} parts at a time` }, { status: 400 });
        }

        // Signed in batches as the upload progresses rather than all up front,
        // so a long transfer can't outlive its own URLs.
        const urls = await Promise.all(parts.map(async partNumber => ({
          partNumber,
          url: await getSignedUrl(b2, new UploadPartCommand({
            Bucket: B2_BUCKET,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
          }), { expiresIn: 3600 }),
        })));

        return NextResponse.json({ urls });
      }

      case "complete": {
        const uploadId = String(body.uploadId ?? "");
        const rawParts = Array.isArray(body.parts) ? body.parts : [];
        if (!uploadId) return NextResponse.json({ error: "Missing uploadId" }, { status: 400 });
        if (!rawParts.length) return NextResponse.json({ error: "No parts" }, { status: 400 });

        // S3 requires parts in ascending order and rejects the whole upload if
        // they aren't, so sort here rather than trusting the client's ordering.
        const parts: UploadedPart[] = rawParts
          .filter((p: { PartNumber?: unknown; ETag?: unknown }) =>
            Number.isInteger(p?.PartNumber) && typeof p?.ETag === "string" && p.ETag)
          .map((p: { PartNumber: number; ETag: string }) => ({
            PartNumber: p.PartNumber, ETag: p.ETag,
          }))
          .sort((a: UploadedPart, b: UploadedPart) => a.PartNumber - b.PartNumber);

        if (!parts.length) return NextResponse.json({ error: "No valid parts" }, { status: 400 });

        await b2.send(new CompleteMultipartUploadCommand({
          Bucket: B2_BUCKET,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts },
        }));

        return NextResponse.json({ ok: true, key });
      }

      case "abort": {
        const uploadId = String(body.uploadId ?? "");
        if (!uploadId) return NextResponse.json({ error: "Missing uploadId" }, { status: 400 });

        // Abandoned multipart uploads keep their parts, and B2 bills for them.
        // The client calls this on cancel or on a failure it can't retry past.
        await b2.send(new AbortMultipartUploadCommand({
          Bucket: B2_BUCKET,
          Key: key,
          UploadId: uploadId,
        }));

        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Multipart upload failed";
    console.error(`[multipart:${action}]`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
