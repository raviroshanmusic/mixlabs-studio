import { sourcePartSize } from "./source-media";
export type Transfer = {
  id: string;
  name: string;
  relative: string;
  path: string;
  size: number;
  modified: number;
  fingerprint: string;
  token?: string;
  partSize: number;
  loaded: number;
  status: "waiting" | "uploading" | "paused" | "failed" | "done" | "cancelled";
  error?: string;
};
export async function fingerprint(file: File, relative: string) {
  const edge = 1024 * 1024;
  const chunks = await Promise.all([
    file.slice(0, edge).arrayBuffer(),
    file.slice(Math.max(0, file.size - edge)).arrayBuffer(),
  ]);
  const info = new TextEncoder().encode(
    JSON.stringify([relative, file.size, file.lastModified]),
  );
  const data = new Uint8Array(
    info.length + chunks[0].byteLength + chunks[1].byteLength,
  );
  data.set(info);
  data.set(new Uint8Array(chunks[0]), info.length);
  data.set(new Uint8Array(chunks[1]), info.length + chunks[0].byteLength);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export function newTransfer(
  file: File,
  relative: string,
  path: string,
  hash: string,
): Transfer {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    relative,
    path,
    size: file.size,
    modified: file.lastModified,
    fingerprint: hash,
    partSize: sourcePartSize(file.size),
    loaded: 0,
    status: "waiting",
  };
}
export function matchingTransfer(
  jobs: Transfer[],
  hash: string,
  reconnecting: string | null,
) {
  return jobs.find(
    (j) =>
      j.fingerprint === hash &&
      !["done", "cancelled"].includes(j.status) &&
      (!reconnecting || reconnecting === "all" || j.id === reconnecting),
  );
}
export function restoreTransfers(raw: string | null): Transfer[] {
  if (!raw) return [];
  const items = JSON.parse(raw);
  if (!Array.isArray(items)) throw new Error("Invalid transfer history");
  return items.map((t) => ({
    ...t,
    status: ["done", "cancelled"].includes(t.status) ? t.status : "paused",
    error: undefined,
  }));
}
const retryStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
const transferActions = new Set([
  "start",
  "status",
  "sign",
  "complete",
  "cancel",
]);
function waitForRetry(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Paused", "AbortError"));
      return;
    }
    const cancel = () => {
      clearTimeout(timer);
      reject(new DOMException("Paused", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", cancel);
      resolve();
    }, ms);
    signal?.addEventListener("abort", cancel, { once: true });
  });
}
export async function api(
  project: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
) {
  const attempts = transferActions.has(String(body.action)) ? 4 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal?.aborted) throw new DOMException("Paused", "AbortError");
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(() => controller.abort(), 120_000);
    let retry = false;
    try {
      const r = await fetch(`/api/projects/${project}/source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      // A gateway can return HTML rather than JSON during a connection failure.
      const data = await r.json().catch(() => null);
      if (r.ok && data) return data;
      if (r.status === 401 || r.status === 403)
        throw new Error(
          "Your session expired or project access changed. Sign in again, then press Resume.",
        );
      if ((r.ok && !data) || retryStatuses.has(r.status)) retry = true;
      else
        throw new Error(
          data?.error ||
            "The server could not process this transfer. Progress has been kept; press Resume to retry.",
        );
    } catch (error) {
      if (signal?.aborted) throw new DOMException("Paused", "AbortError");
      if (error instanceof TypeError || (error as Error).name === "AbortError")
        retry = true;
      else throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    }
    if (retry && attempt + 1 < attempts) {
      await waitForRetry(1500 * 2 ** attempt, signal);
      continue;
    }
    throw new Error(
      "Connection interrupted while contacting the upload service. Your transfer is saved. Check your internet connection, then press Resume; do not add the file again.",
    );
  }
  throw new Error("Transfer request failed");
}

function put(
  url: string,
  blob: Blob,
  signal: AbortSignal,
  progress: (n: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      error ? reject(error) : resolve();
    };
    xhr.open("PUT", url);
    xhr.timeout = 30 * 60 * 1000;
    xhr.upload.onprogress = (e) => progress(e.loaded);
    xhr.onload = () =>
      finish(
        xhr.status >= 200 && xhr.status < 300
          ? undefined
          : new Error(`Upload failed (${xhr.status})`),
      );
    xhr.onerror = () => finish(new Error("Connection interrupted"));
    xhr.ontimeout = () => finish(new Error("Upload timed out"));
    xhr.onabort = () => finish(new DOMException("Paused", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      finish(new DOMException("Paused", "AbortError"));
      return;
    }
    xhr.send(blob);
  });
}
export async function runTransfer(
  project: string,
  t: Transfer,
  file: File,
  signal: AbortSignal,
  save: (patch: Partial<Transfer>) => Promise<void>,
  progress: (n: number) => void,
) {
  let token = t.token,
    partSize = t.partSize;
  if (!token) {
    const started = await api(project, {
      action: "start",
      transferId: t.id,
      path: t.path,
      name: t.name,
      size: t.size,
      fingerprint: t.fingerprint,
    }, signal);
    token = started.token;
    partSize = started.partSize;
    await save({ token, partSize });
    if (started.complete) {
      progress(t.size);
      return;
    }
  }
  if (signal.aborted) throw new DOMException("Paused", "AbortError");
  const state = await api(project, { action: "status", token }, signal);
  if (state.complete) {
    progress(t.size);
    return;
  }
  const total = Math.ceil(t.size / partSize);
  const sent = new Map<number, number>();
  const complete = new Set<number>();
  for (const p of state.parts) {
    if (
      p.PartNumber >= 1 &&
      p.PartNumber <= total &&
      p.Size === Math.min(partSize, t.size - (p.PartNumber - 1) * partSize)
    ) {
      sent.set(p.PartNumber, p.Size);
      complete.add(p.PartNumber);
    }
  }
  const bump = () => progress([...sent.values()].reduce((a, b) => a + b, 0));
  bump();
  const missing = Array.from({ length: total }, (_, i) => i + 1).filter(
    (n) => !complete.has(n),
  );
  let next = 0,
    stopped = false;
  const workers = Array.from(
    { length: Math.min(3, missing.length) },
    async () => {
      while (!stopped && next < missing.length) {
        if (signal.aborted) throw new DOMException("Paused", "AbortError");
        const n = missing[next++];
        const blob = file.slice(
          (n - 1) * partSize,
          Math.min(n * partSize, t.size),
        );
        let last: unknown;
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            const signed = await api(
              project,
              { action: "sign", token, number: n },
              signal,
            );
            await put(signed.url, blob, signal, (loaded) => {
              sent.set(n, loaded);
              bump();
            });
            sent.set(n, blob.size);
            bump();
            last = undefined;
            break;
          } catch (e) {
            last = e;
            sent.delete(n);
            bump();
            if (signal.aborted) throw e;
            await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
          }
        }
        if (last) {
          stopped = true;
          throw last;
        }
      }
    },
  );
  // Wait for all workers before allowing another queue item to start.
  const result = await Promise.allSettled(workers);
  const failed = result.find((r) => r.status === "rejected") as
    | PromiseRejectedResult
    | undefined;
  if (failed) throw failed.reason;
  if (signal.aborted) throw new DOMException("Paused", "AbortError");
  await api(project, { action: "complete", token }, signal);
  progress(t.size);
}
function transferDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("mixlabs-source-transfers", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("queues");
    r.onerror = () =>
      reject(new Error("Enable browser storage to use resumable transfers"));
    r.onsuccess = () => resolve(r.result);
  });
}
export async function readQueue(key: string): Promise<Transfer[]> {
  const db = await transferDB();
  try {
    return await new Promise((resolve, reject) => {
      const r = db
        .transaction("queues")
        .objectStore("queues")
        .getAll(IDBKeyRange.bound(key + ":", key + ":\uffff"));
      r.onsuccess = () => resolve(restoreTransfers(JSON.stringify(r.result)));
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export async function writeQueue(
  key: string,
  jobs: Transfer[],
  previous: Transfer[] = [],
) {
  const db = await transferDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("queues", "readwrite");
      const old = new Map(previous.map((j) => [j.id, j]));
      for (const job of jobs)
        if (old.get(job.id) !== job)
          tx.objectStore("queues").put(job, key + ":" + job.id);
      const remaining = new Set(jobs.map((j) => j.id));
      for (const job of previous)
        if (!remaining.has(job.id))
          tx.objectStore("queues").delete(key + ":" + job.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          new Error("Could not save transfer progress. Check browser storage."),
        );
      tx.onabort = () => reject(new Error("Could not save transfer progress"));
    });
  } finally {
    db.close();
  }
}
