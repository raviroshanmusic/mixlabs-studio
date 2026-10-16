import {
  AbortMultipartUploadCommand, DeleteObjectsCommand,
  ListMultipartUploadsCommand, ListObjectVersionsCommand,
} from "@aws-sdk/client-s3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { b2, B2_BUCKET } from "./b2";

export function projectPrefix(id: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid project ID");
  }
  return `projects/${id}/`;
}

// Never interpret a third-party delivery link as permission to delete an object.
export function storageKey(value: unknown, projectId: string): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const prefix = projectPrefix(projectId);
  let key = value.trim();
  if (!key.startsWith("projects/")) {
    try {
      const url = new URL(key, "https://project.mixlabscreative.com");
      if (["project.mixlabscreative.com", "localhost", "127.0.0.1"].includes(url.hostname)
          && url.pathname === "/api/media") {
        key = url.searchParams.get("key") ?? "";
      } else if (process.env.B2_ENDPOINT &&
          url.hostname === new URL(process.env.B2_ENDPOINT.trim()).hostname &&
          url.pathname.startsWith(`/${B2_BUCKET}/`)) {
        key = decodeURIComponent(url.pathname.slice(B2_BUCKET.length + 2));
      } else return null;
    } catch { return null; }
  }
  return key.startsWith(prefix) && key.length > prefix.length ? key : null;
}

export function rowKeys(row: Record<string, unknown>, projectId: string): string[] {
  const values: unknown[] = [row.drive_url, row.file_key];
  if (Array.isArray(row.renditions)) {
    for (const rendition of row.renditions) values.push(rendition?.key);
  }
  if (Array.isArray(row.links)) {
    for (const link of row.links) {
      if (typeof link === "string") values.push(link);
      else if (link) values.push(link.url, link.key, link.file_key);
    }
  }
  return [...new Set(values.map(v => storageKey(v, projectId)).filter((v): v is string => !!v))];
}

// Injected in tests; production uses the same client and bucket as uploads.
export function storageCleaner(client = b2, bucket = B2_BUCKET) {
  async function list(prefix: string) {
    if (!bucket) throw new Error("Storage bucket is not configured");
    const objects: { Key: string; VersionId: string }[] = [];
    let KeyMarker: string | undefined;
    let VersionIdMarker: string | undefined;
    do {
      const page = await client.send(new ListObjectVersionsCommand({
        Bucket: bucket, Prefix: prefix, KeyMarker, VersionIdMarker,
      }));
      for (const item of [...page.Versions ?? [], ...page.DeleteMarkers ?? []]) {
        if (!item.Key?.startsWith(prefix) || !item.VersionId) {
          throw new Error("Storage returned an invalid object version");
        }
        objects.push({ Key: item.Key, VersionId: item.VersionId });
      }
      if (!page.IsTruncated) break;
      if (!page.NextKeyMarker || (page.NextKeyMarker === KeyMarker && page.NextVersionIdMarker === VersionIdMarker)) {
        throw new Error("Storage pagination did not advance");
      }
      KeyMarker = page.NextKeyMarker;
      VersionIdMarker = page.NextVersionIdMarker;
    } while (true);
    return objects;
  }

  async function remove(objects: { Key: string; VersionId: string }[]) {
    for (let at = 0; at < objects.length; at += 1000) {
      const result = await client.send(new DeleteObjectsCommand({
        Bucket: bucket, Delete: { Objects: objects.slice(at, at + 1000), Quiet: true },
      }));
      // S3 can report HTTP 200 and still reject individual files (e.g. retention).
      if (result.Errors?.length) throw new Error("Storage could not delete every file version");
    }
  }

  return {
    async keys(keys: string[]) {
      for (const key of new Set(keys)) {
        const versions = (await list(key)).filter(item => item.Key === key);
        await remove(versions);
        if ((await list(key)).some(item => item.Key === key)) {
          throw new Error("File versions remain in storage; retry deletion");
        }
      }
    },
    async project(id: string) {
      const prefix = projectPrefix(id);
      // Abort unfinished uploads too: their parts also consume paid storage.
      let KeyMarker: string | undefined;
      let UploadIdMarker: string | undefined;
      const uploads: { Key: string; UploadId: string }[] = [];
      do {
        const page = await client.send(new ListMultipartUploadsCommand({ Bucket: bucket, Prefix: prefix, KeyMarker, UploadIdMarker }));
        for (const upload of page.Uploads ?? []) {
          if (!upload.Key?.startsWith(prefix) || !upload.UploadId) throw new Error("Invalid unfinished upload");
          uploads.push({ Key: upload.Key, UploadId: upload.UploadId });
        }
        if (!page.IsTruncated) break;
        if (!page.NextKeyMarker || (page.NextKeyMarker === KeyMarker && page.NextUploadIdMarker === UploadIdMarker)) {
          throw new Error("Upload pagination did not advance");
        }
        KeyMarker = page.NextKeyMarker;
        UploadIdMarker = page.NextUploadIdMarker;
      } while (true);
      for (const upload of uploads) await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, ...upload }));
      await remove(await list(prefix));
      if ((await list(prefix)).length) throw new Error("Files remain in storage; retry project deletion");
    },
  };
}

export type FileTable = "project_versions" | "project_documents" | "project_exchange" | "project_deliveries";
const columns: Record<FileTable, string> = {
  project_versions: "id,drive_url", project_documents: "id,file_key",
  project_exchange: "id,file_key", project_deliveries: "id,links",
};

async function fileRows(db: SupabaseClient, table: FileTable, id: string) {
  const rows: Record<string, unknown>[] = [];
  for (let start = 0; ; start += 1000) {
    const result = await db.from(table).select(columns[table]).eq("project_id", id).order("id").range(start, start + 999);
    if (result.error) throw new Error(`Could not read file references: ${result.error.message}`);
    const page = result.data as unknown as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  if (table === "project_versions") {
    // V1 databases may not have V2's optional proxy column yet.
    for (let start = 0; ; start += 1000) {
      const result = await db.from(table).select("id,renditions").eq("project_id", id).order("id").range(start, start + 999);
      if (result.error) {
        if (["42703", "PGRST204"].includes(result.error.code)) break;
        throw new Error(`Could not read proxies: ${result.error.message}`);
      }
      const byId = new Map(result.data.map(row => [row.id, row.renditions]));
      for (const row of rows) if (byId.has(row.id)) row.renditions = byId.get(row.id);
      if (result.data.length < 1000) break;
    }
  }
  return rows;
}

// Storage deletion must fail closed: unlike database writes, RLS cannot undo it.
export async function deleteFileRecord(db: SupabaseClient, projectId: string, table: FileTable, recordId: string, userId: string) {
  const project = await db.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
  if (project.error) return { error: "Project access could not be verified", status: 503 };
  const isOwner = project.data?.owner_id === userId;
  const access = isOwner ? { data: true, error: null } : await db.rpc("can_edit_project", { pid: projectId });
  if (access.error || access.data !== true) return { error: "Editor access could not be verified", status: 403 };
  const tables = Object.keys(columns) as FileTable[];
  const all = await Promise.all(tables.map(async table => ({ table, rows: await fileRows(db, table, projectId) })));
  const target = all.find(item => item.table === table)!.rows.find(row => row.id === recordId);
  if (!target) return { error: "File record not found", status: 404 };
  const shared = new Set(all.flatMap(item => item.rows
    .filter(row => item.table !== table || row.id !== recordId)
    .flatMap(row => rowKeys(row, projectId))));
  await storageCleaner().keys(rowKeys(target, projectId).filter(key => !shared.has(key)));
  // Keep the record on storage failure so the user can retry, never silently orphan files.
  const result = await db.from(table).delete().eq("id", recordId).eq("project_id", projectId).select("id");
  if (result.error || result.data?.length !== 1) throw new Error("Could not remove file record; retry deletion");
  return { status: 200 };
}
