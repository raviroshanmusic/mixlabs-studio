"use client";
import { useState, useRef } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Film } from "lucide-react";
import {
  PART_SIZE, MULTIPART_THRESHOLD, CONCURRENCY, SIGN_BATCH,
  MAX_PART_RETRIES, partCount, type UploadedPart,
} from "@/lib/multipart";

type Props = {
  projectId: string;
  onUploaded: (fileKey: string, filename: string, fileSize: number) => void;
  // Optional overrides so the same uploader works for media (versions) and for
  // reference documents (scripts, mood boards, EDLs, ...).
  accept?: string;                       // <input accept="..."> value
  folder?: string;                       // B2 sub-folder, e.g. "docs"
  hint?: string;                         // small caption under the prompt
  icon?: React.ReactNode;                // glyph in the drop zone
  validate?: (file: File) => string | null; // return an error string or null
};

const defaultValidate = (file: File): string | null =>
  file.type.startsWith("video/") || file.type.startsWith("audio/")
    ? null
    : "Only video and audio files are supported";

export default function B2Upload({
  projectId,
  onUploaded,
  accept = "video/*,audio/*",
  folder,
  hint = "Video or audio · any size",
  icon,
  validate = defaultValidate,
}: Props) {
  const [dragging, setDragging]   = useState(false);
  const [progress, setProgress]   = useState<number | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [done, setDone]           = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // One PUT with progress reporting. Used for whole small files, and for each
  // part of a large one.
  function putWithProgress(
    url: string, blob: Blob, contentType: string | null,
    onProgress: (loaded: number) => void,
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      if (contentType) xhr.setRequestHeader("Content-Type", contentType);
      xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded); };
      xhr.onload = () => xhr.status < 300
        // ETag identifies the part when completing the upload. It needs to be
        // in the bucket's CORS ExposeHeaders or the browser hides it from us.
        ? resolve(xhr.getResponseHeader("ETag"))
        : reject(new Error(`Upload failed: ${xhr.status}`));
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.ontimeout = () => reject(new Error("Upload timed out"));
      xhr.send(blob);
    });
  }

  // Large files go part by part. A single PUT is capped at 5GB by B2, and one
  // presigned URL expires an hour after it's issued — so a 16GB master could
  // fail on either count. Parts are signed in batches as we go, retried
  // individually, and a drop at 90% costs one part instead of the whole file.
  async function uploadMultipart(file: File, key: string) {
    const total = partCount(file.size);
    const contentType = file.type || "application/octet-stream";

    const created = await fetch("/api/upload/multipart", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", key, contentType }),
    });
    if (!created.ok) throw new Error((await created.json().catch(() => ({}))).error || "Could not start upload");
    const { uploadId } = await created.json();

    // Bytes confirmed per part, so progress doesn't jump around as parts
    // upload concurrently and retries replay bytes already counted.
    const sent = new Array<number>(total).fill(0);
    const bump = () => {
      const loaded = sent.reduce((a, b) => a + b, 0);
      setProgress(Math.min(99, Math.round((loaded / file.size) * 100)));
    };

    const parts: UploadedPart[] = [];

    try {
      for (let start = 1; start <= total; start += SIGN_BATCH) {
        const numbers = Array.from(
          { length: Math.min(SIGN_BATCH, total - start + 1) },
          (_, i) => start + i,
        );

        const signed = await fetch("/api/upload/multipart", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sign", key, uploadId, partNumbers: numbers }),
        });
        if (!signed.ok) throw new Error((await signed.json().catch(() => ({}))).error || "Could not sign parts");
        const { urls } = await signed.json() as { urls: { partNumber: number; url: string }[] };

        // A few parts in flight at once — enough to use the connection, not so
        // many that they starve each other.
        for (let i = 0; i < urls.length; i += CONCURRENCY) {
          await Promise.all(urls.slice(i, i + CONCURRENCY).map(async ({ partNumber, url }) => {
            const from = (partNumber - 1) * PART_SIZE;
            const blob = file.slice(from, Math.min(from + PART_SIZE, file.size));

            let lastError: unknown;
            for (let attempt = 0; attempt < MAX_PART_RETRIES; attempt++) {
              try {
                const etag = await putWithProgress(url, blob, null, loaded => {
                  sent[partNumber - 1] = loaded; bump();
                });
                if (!etag) {
                  throw new Error(
                    "B2 did not return an ETag for this part — the bucket's CORS rules " +
                    "need to expose the ETag header.",
                  );
                }
                parts.push({ PartNumber: partNumber, ETag: etag });
                sent[partNumber - 1] = blob.size; bump();
                return;
              } catch (e) {
                lastError = e;
                sent[partNumber - 1] = 0; bump();
                // Back off briefly; a blip mid-transfer is common on long uploads.
                await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
              }
            }
            throw lastError instanceof Error ? lastError : new Error("A part failed to upload");
          }));
        }
      }

      const done = await fetch("/api/upload/multipart", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", key, uploadId, parts }),
      });
      if (!done.ok) throw new Error((await done.json().catch(() => ({}))).error || "Could not finish upload");
    } catch (e) {
      // Abandoned parts sit in the bucket and B2 bills for them, so clean up
      // before surfacing the error.
      await fetch("/api/upload/multipart", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "abort", key, uploadId }),
      }).catch(() => {});
      throw e;
    }
  }

  async function upload(file: File) {
    setError(null);
    setDone(false);
    setProgress(0);

    try {
      // 1. Reserve a key and, for small files, get a plain presigned PUT.
      const res = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          projectId,
          folder,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to get upload URL");
      }
      const { uploadUrl, fileKey } = await res.json();

      // 2. Small files in one shot; anything large goes multipart.
      if (file.size > MULTIPART_THRESHOLD) {
        await uploadMultipart(file, fileKey);
      } else {
        await putWithProgress(uploadUrl, file, file.type || "application/octet-stream",
          loaded => setProgress(Math.round((loaded / file.size) * 100)));
      }

      setProgress(100);
      setDone(true);
      onUploaded(fileKey, file.name, file.size);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setProgress(null);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    const err = validate(file);
    if (err) { setError(err); return; }
    upload(file);
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => progress === null && inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-all cursor-pointer ${
        dragging ? "border-white/30 bg-white/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
      } ${progress !== null ? "cursor-default pointer-events-none" : ""}`}>

      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => handleFiles(e.target.files)} />

      {done ? (
        <>
          <CheckCircle2 size={28} className="text-emerald-400" />
          <p className="text-emerald-300 text-sm font-medium">Upload complete</p>
        </>
      ) : error ? (
        <>
          <AlertCircle size={28} className="text-rose-400" />
          <p className="text-rose-300 text-sm text-center">{error}</p>
          <button onClick={e => { e.stopPropagation(); setError(null); }}
            className="text-white/40 hover:text-white/70 text-xs underline">Try again</button>
        </>
      ) : progress !== null ? (
        <>
          <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-white/60 rounded-full transition-all duration-150" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-white/50 text-sm">{progress}% uploaded…</p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/30">
            {icon ?? <Film size={22} />}
          </div>
          <div className="text-center">
            <p className="text-white/60 text-sm font-medium">Drop file or tap to browse</p>
            <p className="text-white/25 text-xs mt-1">{hint}</p>
          </div>
          <div className="flex items-center gap-1.5 text-white/20 text-[10px]">
            <Upload size={10} />
            <span>Uploads directly to secure storage</span>
          </div>
        </>
      )}
    </div>
  );
}
