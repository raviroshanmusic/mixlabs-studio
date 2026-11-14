import { NextRequest, NextResponse } from "next/server";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  ListObjectsV2Command,
  ListMultipartUploadsCommand,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  ListPartsCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2, B2_BUCKET as Bucket } from "@/lib/b2";
import { createClient } from "@/lib/supabase/server";
import { projectPrefix, storageCleaner } from "@/lib/storage-cleanup";
import { sourcePath, sourcePartSize, sourceName } from "@/lib/source-media";
export const maxDuration = 300;
type Session = {
  key: string;
  uploadId: string;
  size: number;
  partSize: number;
  userId: string;
  fingerprint: string;
};
function sign(value: string) {
  const secret = process.env.B2_APPLICATION_KEY?.trim();
  if (!secret) throw new Error("Storage is not configured");
  return createHmac("sha256", secret).update(value).digest("hex");
}
function encode(s: Session) {
  const value = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${value}.${sign(value)}`;
}
function decode(token: unknown, userId: string, prefix: string): Session {
  if (typeof token !== "string") throw new Error("Missing transfer session");
  const [v, sig] = token.split(".");
  const expected = sign(v);
  if (
    !sig ||
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  )
    throw new Error("Invalid transfer session");
  const s = JSON.parse(Buffer.from(v, "base64url").toString()) as Session;
  if (
    s.userId !== userId ||
    !s.key.startsWith(prefix) ||
    s.partSize !== sourcePartSize(s.size)
  )
    throw new Error("Invalid transfer session");
  return s;
}
async function access(id: string) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data, error } = await db
    .from("projects")
    .select("id,owner_id")
    .eq("id", id)
    .maybeSingle();
  return !error && data ? { db, user, project: data } : null;
}
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const a = await access(id);
  if (!a)
    return NextResponse.json(
      { error: "Project access required" },
      { status: 403 },
    );
  try {
    const root = projectPrefix(id) + "source/";
    const path = sourcePath(req.nextUrl.searchParams.get("path") ?? "");
    const prefix = root + (path ? path + "/" : "");
    const page = await b2.send(
      new ListObjectsV2Command({
        Bucket,
        Prefix: prefix,
        Delimiter:
          req.nextUrl.searchParams.get("tree") === "1" ? undefined : "/",
        ContinuationToken: req.nextUrl.searchParams.get("cursor") ?? undefined,
        MaxKeys: 500,
      }),
    );
    return NextResponse.json({
      userId: a.user.id,
      folders: (page.CommonPrefixes ?? []).map((p) => ({
        path: p.Prefix!.slice(root.length, -1),
        name: p.Prefix!.slice(prefix.length, -1),
      })),
      files: (page.Contents ?? [])
        .filter((o) => o.Key !== prefix && !o.Key?.endsWith("/"))
        .map((o) => ({
          key: o.Key,
          name: sourceName(o.Key!),
          relative: o
            .Key!.slice(prefix.length)
            .split("/")
            .map((p, i, all) => (i === all.length - 1 ? sourceName(p) : p))
            .join("/"),
          size: o.Size ?? 0,
          modified: o.LastModified,
        })),
      cursor: page.NextContinuationToken ?? null,
    });
  } catch (e) {
    console.error("Source listing failed", e);
    return NextResponse.json(
      { error: "Could not load source media" },
      { status: 502 },
    );
  }
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const a = await access(id);
  if (!a)
    return NextResponse.json(
      { error: "Project access required" },
      { status: 403 },
    );
  try {
    const body = await req.json();
    const prefix = projectPrefix(id) + "source/";
    if (body.action === "delete-folder") {
      const {data: canEdit, error} = await a.db.rpc("can_edit_project", {pid: id});
      if (error || !canEdit) return NextResponse.json({error: "Only project editors or owners can delete source folders"}, {status: 403});
      const folder = sourcePath(body.path);
      if (!folder) throw new Error("Select a source folder");
      await storageCleaner().sourceFolder(id, folder);
      return NextResponse.json({ok: true});
    }
    if (body.action === "folder") {
      const path = sourcePath(body.path);
      if (!path) throw new Error("Folder name required");
      await b2.send(
        new PutObjectCommand({
          Bucket,
          Key: prefix + path + "/",
          Body: "",
          ContentType: "application/x-directory",
        }),
      );
      return NextResponse.json({ ok: true });
    }
    if (body.action === "delete") {
      const { data: canEdit, error } = await a.db.rpc("can_edit_project", {
        pid: id,
      });
      if (error || !canEdit)
        return NextResponse.json(
          { error: "Only project editors or owners can delete source files" },
          { status: 403 },
        );
      if (
        typeof body.key !== "string" ||
        !body.key.startsWith(prefix) ||
        body.key.endsWith("/")
      )
        throw new Error("Select a source file");
      await storageCleaner().keys([body.key]);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "start") {
      const path = sourcePath(body.path ?? "");
      const name = sourcePath(body.name);
      if (!name || name.includes("/")) throw new Error("Invalid filename");
      const partSize = sourcePartSize(body.size);
      if (
        typeof body.fingerprint !== "string" ||
        !/^[a-f0-9]{64}$/.test(body.fingerprint)
      )
        throw new Error("Invalid file fingerprint");
      if (
        typeof body.transferId !== "string" ||
        !/^[0-9a-f-]{36}$/.test(body.transferId)
      )
        throw new Error("Invalid transfer ID");
      const key =
        prefix +
        (path ? path + "/" : "") +
        createHash("sha256")
          .update(a.user.id + body.transferId)
          .digest("hex") +
        "~" +
        name;
      const s: Session = {
        key,
        uploadId: "",
        size: body.size,
        partSize,
        userId: a.user.id,
        fingerprint: body.fingerprint,
      };
      // Empty files do not need multipart; preserve card sidecars even when empty.
      if (!body.size) {
        await b2.send(
          new PutObjectCommand({
            Bucket,
            Key: key,
            Body: "",
            Metadata: { fingerprint: s.fingerprint },
          }),
        );
        return NextResponse.json({
          token: encode(s),
          complete: true,
          key,
          partSize,
        });
      }
      try {
        const existing = await b2.send(
          new HeadObjectCommand({ Bucket, Key: key }),
        );
        if (
          existing.ContentLength !== s.size ||
          existing.Metadata?.fingerprint !== s.fingerprint
        )
          throw new Error("File identity mismatch");
        return NextResponse.json({
          token: encode(s),
          complete: true,
          key,
          partSize,
        });
      } catch (e) {
        if (
          (e as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode !== 404
        )
          throw e;
      }
      const pending = await b2.send(
        new ListMultipartUploadsCommand({
          Bucket,
          Prefix: key,
          MaxUploads: 100,
        }),
      );
      const previous = pending.Uploads?.find((u) => u.Key === key);
      if (previous?.UploadId) {
        s.uploadId = previous.UploadId;
        return NextResponse.json({ token: encode(s), key, partSize });
      }
      const out = await b2.send(
        new CreateMultipartUploadCommand({
          Bucket,
          Key: key,
          ContentType: "application/octet-stream",
          Metadata: { fingerprint: s.fingerprint },
        }),
      );
      if (!out.UploadId) throw new Error("Could not start transfer");
      s.uploadId = out.UploadId;
      return NextResponse.json({ token: encode(s), key, partSize });
    }
    const s = decode(body.token, a.user.id, prefix);
    const base = { Bucket, Key: s.key, UploadId: s.uploadId };
    async function completed() {
      try {
        const h = await b2.send(new HeadObjectCommand({ Bucket, Key: s.key }));
        return (
          h.ContentLength === s.size &&
          h.Metadata?.fingerprint === s.fingerprint
        );
      } catch (e) {
        if (
          (e as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode === 404
        )
          return false;
        throw e;
      }
    }
    async function parts() {
      const all: { PartNumber: number; ETag: string; Size: number }[] = [];
      let marker: string | undefined;
      do {
        const p = await b2.send(
          new ListPartsCommand({ ...base, PartNumberMarker: marker }),
        );
        for (const item of p.Parts ?? [])
          if (item.PartNumber && item.ETag)
            all.push({
              PartNumber: item.PartNumber,
              ETag: item.ETag,
              Size: item.Size ?? 0,
            });
        if (!p.IsTruncated) break;
        if (!p.NextPartNumberMarker || p.NextPartNumberMarker === marker)
          throw new Error("Invalid part pagination");
        marker = p.NextPartNumberMarker;
      } while (true);
      return all;
    }
    if (body.action === "status") {
      if (await completed())
        return NextResponse.json({ complete: true, key: s.key, parts: [] });
      return NextResponse.json({ complete: false, parts: await parts() });
    }
    if (body.action === "sign") {
      const number = body.number;
      if (
        !Number.isInteger(number) ||
        number < 1 ||
        number > Math.ceil(s.size / s.partSize)
      )
        throw new Error("Invalid part number");
      return NextResponse.json({
        url: await getSignedUrl(
          b2,
          new UploadPartCommand({ ...base, PartNumber: number }),
          { expiresIn: 3600 },
        ),
      });
    }
    if (body.action === "complete") {
      if (!(await completed())) {
        const p = await parts();
        const count = Math.ceil(s.size / s.partSize);
        if (
          p.length !== count ||
          p.some(
            (v, i) =>
              v.PartNumber !== i + 1 ||
              v.Size !== Math.min(s.partSize, s.size - i * s.partSize),
          )
        )
          throw new Error("Transfer is incomplete; resume missing parts");
        await b2.send(
          new CompleteMultipartUploadCommand({
            ...base,
            MultipartUpload: {
              Parts: p.map(({ PartNumber, ETag }) => ({ PartNumber, ETag })),
            },
          }),
        );
        if (!(await completed()))
          throw new Error("Could not verify completed file");
      }
      return NextResponse.json({ complete: true, key: s.key });
    }
    if (body.action === "cancel") {
      if (await completed())
        return NextResponse.json({ complete: true, key: s.key });
      try {
        await b2.send(new AbortMultipartUploadCommand(base));
      } catch (e) {
        if ((e as { name: string }).name !== "NoSuchUpload") throw e;
      }
      return NextResponse.json({ ok: true });
    }
    throw new Error("Unknown transfer action");
  } catch (e) {
    console.error("Source transfer failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Source transfer failed" },
      { status: 400 },
    );
  }
}
