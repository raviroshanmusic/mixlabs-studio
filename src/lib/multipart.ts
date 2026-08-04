// Multipart upload settings, shared by the API route and the uploader.
//
// A single presigned PUT is capped at 5GB by S3-compatible storage, B2
// included, and a post house routinely hands over more than that — a 16GB
// master is a normal Tuesday. Multipart splits the file, uploads the parts
// independently, and asks B2 to stitch them at the end.
//
// It also fixes the quieter failure: one presigned URL expires an hour after
// it's issued, so a large file on an ordinary connection could die mid-transfer
// even when it was under the size cap. Parts are signed in batches as the
// upload progresses, so the clock never runs out on the whole job.

// 100MB parts: 16GB → 160 parts, well inside S3's 10,000-part ceiling, and big
// enough that per-part overhead stays irrelevant. The floor is 5MB for every
// part except the last — that's an S3 rule, not a preference.
export const PART_SIZE = 100 * 1024 * 1024;

// Below this a single PUT is simpler and faster: no create, no complete, no
// per-part signing round trips.
export const MULTIPART_THRESHOLD = 100 * 1024 * 1024;

// Parts uploaded at once. Enough to saturate a decent connection without
// opening so many sockets that they starve each other.
export const CONCURRENCY = 4;

// Parts signed per request, so a 160-part upload doesn't need 160 round trips
// just to get its URLs.
export const SIGN_BATCH = 20;

export const MAX_PART_RETRIES = 3;

export type UploadedPart = { PartNumber: number; ETag: string };

export function partCount(fileSize: number): number {
  return Math.max(1, Math.ceil(fileSize / PART_SIZE));
}
