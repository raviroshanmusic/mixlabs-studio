// Audit B2 for orphaned project files — objects in the bucket that no database
// row references any more. REPORT ONLY: this script never deletes anything.
//
// Orphans accumulate because uploads are two-phase. The browser PUTs straight to
// B2 via a presigned URL, then the API inserts the row. If that insert fails the
// file is already in the bucket with nothing pointing at it — which is what the
// project_versions RLS bug did on every blocked upload.
//
// Usage:
//   B2_ENDPOINT=... B2_KEY_ID=... B2_APPLICATION_KEY=... B2_BUCKET_NAME=... \
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/audit-b2-orphans.mjs
//
// The service-role key is required: it bypasses RLS so the script sees every
// project's rows, not just yours. Grab it from Supabase → Settings → API.
// Don't commit it anywhere.

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const {
  B2_ENDPOINT, B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME,
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

const missing = Object.entries({
  B2_ENDPOINT, B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME,
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
}).filter(([, v]) => !v).map(([k]) => k);

if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const b2 = new S3Client({
  endpoint: B2_ENDPOINT.trim(),
  region: "us-east-005",
  credentials: {
    accessKeyId: B2_KEY_ID.trim(),
    secretAccessKey: B2_APPLICATION_KEY.trim(),
  },
});

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// A stored value may be a bare key ("projects/<id>/123-cut.mov") or a full URL
// that embeds one. Normalise to the key so both compare equal.
function toKey(value) {
  if (typeof value !== "string" || !value) return null;
  const at = value.indexOf("projects/");
  return at === -1 ? null : decodeURIComponent(value.slice(at).split("?")[0]);
}

// project_deliveries.links is jsonb — an array of strings or of objects with a
// url/key field, depending on when the row was written. Handle both shapes.
function keysFromLinks(links) {
  if (!Array.isArray(links)) return [];
  return links.flatMap((l) =>
    typeof l === "string" ? [toKey(l)] : [toKey(l?.url), toKey(l?.key), toKey(l?.file_key)]
  );
}

async function listAllObjects() {
  const objects = [];
  let ContinuationToken;
  do {
    const page = await b2.send(new ListObjectsV2Command({
      Bucket: B2_BUCKET_NAME,
      Prefix: "projects/",          // avatars/ is deliberately out of scope
      ContinuationToken,
    }));
    for (const o of page.Contents ?? []) {
      objects.push({ key: o.Key, size: o.Size ?? 0, modified: o.LastModified });
    }
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return objects;
}

async function referencedKeys() {
  const referenced = new Set();
  const add = (k) => { if (k) referenced.add(k); };

  const [versions, documents, exchange, deliveries] = await Promise.all([
    supabase.from("project_versions").select("drive_url"),
    supabase.from("project_documents").select("file_key"),
    supabase.from("project_exchange").select("file_key"),
    supabase.from("project_deliveries").select("links"),
  ]);

  for (const [name, res] of Object.entries({ versions, documents, exchange, deliveries })) {
    if (res.error) throw new Error(`Reading ${name} failed: ${res.error.message}`);
  }

  versions.data.forEach((r) => add(toKey(r.drive_url)));
  documents.data.forEach((r) => add(toKey(r.file_key)));
  exchange.data.forEach((r) => add(toKey(r.file_key)));
  deliveries.data.forEach((r) => keysFromLinks(r.links).forEach(add));

  return referenced;
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

const [objects, referenced] = await Promise.all([listAllObjects(), referencedKeys()]);
const orphans = objects.filter((o) => !referenced.has(o.key));
const orphanBytes = orphans.reduce((sum, o) => sum + o.size, 0);

console.log(`\nBucket objects under projects/ : ${objects.length}`);
console.log(`Referenced by a database row   : ${referenced.size}`);
console.log(`Orphaned                       : ${orphans.length} (${mb(orphanBytes)} MB)\n`);

if (!orphans.length) {
  console.log("No orphans. Nothing to clean up.\n");
} else {
  orphans
    .sort((a, b) => b.size - a.size)
    .forEach((o) => {
      console.log(`  ${mb(o.size).padStart(9)} MB  ${o.modified?.toISOString().slice(0, 10)}  ${o.key}`);
    });
  console.log(`\n${orphans.length} orphaned object(s), ${mb(orphanBytes)} MB.`);
  console.log("REVIEW THIS LIST BEFORE DELETING ANYTHING — an object is only");
  console.log("truly orphaned if no code path writes its row after the upload.");
  console.log("Delete from the B2 console once you're satisfied.\n");
}
