// Read the B2 bucket's CORS rules and say whether multipart uploads can work.
//
// Multipart needs two things from CORS that single-PUT never did:
//   1. ETag in ExposeHeaders — completing an upload requires each part's ETag,
//      and the browser cannot read that header unless CORS exposes it.
//   2. The origin you upload from must be allowed (localhost included, if you
//      test locally).
//
// Usage:
//   B2_ENDPOINT=... B2_KEY_ID=... B2_APPLICATION_KEY=... B2_BUCKET_NAME=... \
//   node scripts/check-b2-cors.mjs

import { S3Client, GetBucketCorsCommand } from "@aws-sdk/client-s3";

const { B2_ENDPOINT, B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME } = process.env;

const missing = Object.entries({ B2_ENDPOINT, B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME })
  .filter(([, v]) => !v).map(([k]) => k);
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

let rules;
try {
  const out = await b2.send(new GetBucketCorsCommand({ Bucket: B2_BUCKET_NAME }));
  rules = out.CORSRules ?? [];
} catch (err) {
  const code = err?.name ?? "";
  if (/NoSuchCORSConfiguration/i.test(code)) {
    console.log("\n❌ No CORS rules are set on this bucket at all.");
    console.log("   Browser uploads cannot work without them. See the fix below.\n");
    process.exit(1);
  }
  // B2's S3 layer hasn't always supported reading CORS. Say so rather than
  // implying the bucket is misconfigured.
  console.error(`\nCouldn't read CORS via the S3 API (${code || err.message}).`);
  console.error("Check it in the Backblaze console or with the b2 CLI instead:\n");
  console.error("  b2 bucket get " + B2_BUCKET_NAME + "\n");
  process.exit(2);
}

console.log(`\nCORS rules on ${B2_BUCKET_NAME}: ${rules.length}\n`);

let exposesEtag = false;
let allowsPut = false;
const origins = new Set();

for (const [i, r] of rules.entries()) {
  const expose = (r.ExposeHeaders ?? []).map(h => h.toLowerCase());
  const methods = r.AllowedMethods ?? [];
  (r.AllowedOrigins ?? []).forEach(o => origins.add(o));

  if (expose.includes("etag")) exposesEtag = true;
  if (methods.includes("PUT") || methods.includes("*")) allowsPut = true;

  console.log(`  Rule ${i + 1}`);
  console.log(`    Origins:  ${(r.AllowedOrigins ?? []).join(", ") || "(none)"}`);
  console.log(`    Methods:  ${methods.join(", ") || "(none)"}`);
  console.log(`    Expose:   ${expose.join(", ") || "(none)"}`);
  console.log("");
}

console.log("Multipart upload readiness:");
console.log(`  ${allowsPut    ? "✅" : "❌"} PUT allowed`);
console.log(`  ${exposesEtag  ? "✅" : "❌"} ETag exposed  ${exposesEtag ? "" : "← multipart WILL fail without this"}`);
console.log(`  origins allowed: ${[...origins].join(", ") || "(none)"}`);
console.log(
  origins.has("*")
    ? "  (all origins allowed)"
    : "  ↑ every origin you upload from must be here, including http://localhost:3000 for local testing",
);
console.log("");

process.exit(exposesEtag && allowsPut ? 0 : 1);
