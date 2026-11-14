"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Folder,
  FolderPlus,
  Upload,
  File,
  Download,
  ChevronRight,
  Pause,
  Play,
  RotateCw,
  X,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import {
  api,
  fingerprint,
  newTransfer,
  readQueue,
  writeQueue,
  runTransfer,
  type Transfer,
} from "@/lib/source-transfer";
import { downloadSourceFolder } from "@/lib/source-download";
import { bytes, sourcePath } from "@/lib/source-media";
type Entry = { key: string; name: string; size: number };
type Directory = { name: string; path: string };
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/65 hover:bg-white/5 disabled:opacity-30";
export default function SourceMedia({
  projectId,
  canEdit,
  legacy,
}: {
  projectId: string;
  canEdit: boolean;
  legacy: React.ReactNode;
}) {
  const [queueLimit, setQueueLimit] = useState(100);
  const [downloading, setDownloading] = useState(false),
    [downloadStatus, setDownloadStatus] = useState("");
  const [path, setPath] = useState(""),
    [folders, setFolders] = useState<Directory[]>([]),
    [files, setFiles] = useState<Entry[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [userId, setUserId] = useState(""),
    [ready, setReady] = useState(false),
    [jobs, setJobs] = useState<Transfer[]>([]),
    [paused, setPaused] = useState(true),
    [live, setLive] = useState({ loaded: 0, bps: 0, eta: 0 }),
    [picking, setPicking] = useState(false),
    [newFolder, setNewFolder] = useState(""),
    [showFolder, setShowFolder] = useState(false),
    [showLegacy, setShowLegacy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null),
    folderInput = useRef<HTMLInputElement>(null),
    selected = useRef(new Map<string, globalThis.File>()),
    jobsRef = useRef<Transfer[]>([]),
    running = useRef<{ id: string; controller: AbortController } | null>(null),
    mounted = useRef(true),
    scope = useRef(""),
    writes = useRef(Promise.resolve()),
    loadId = useRef(0);
  const load = useCallback(
    async (next?: string) => {
      const request = ++loadId.current;
      setLoading(true);
      try {
        const r = await fetch(
          `/api/projects/${projectId}/source?path=${encodeURIComponent(path)}${next ? "&cursor=" + encodeURIComponent(next) : ""}`,
        );
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (request !== loadId.current) return;
        setUserId(data.userId);
        setFolders((p) => (next ? [...p, ...data.folders] : data.folders));
        setFiles((p) => (next ? [...p, ...data.files] : data.files));
        setCursor(data.cursor);
      } catch (e) {
        if (request === loadId.current)
          setError(e instanceof Error ? e.message : "Could not load files");
      } finally {
        if (request === loadId.current) setLoading(false);
      }
    },
    [path, projectId],
  );
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      running.current?.controller.abort();
    };
  }, []);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setReady(false);
    const key = projectId + ":" + userId;
    scope.current = key;
    readQueue(key)
      .then((items) => {
        if (!cancelled) {
          jobsRef.current = items;
          setJobs(items);
          setReady(true);
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [projectId, userId]);
  const commit = useCallback((update: (old: Transfer[]) => Transfer[]) => {
    const previous = jobsRef.current;
    const next = update(previous);
    jobsRef.current = next;
    if (mounted.current) setJobs(next);
    const key = scope.current;
    const task = writes.current
      .catch(() => {})
      .then(() => writeQueue(key, next, previous));
    writes.current = task;
    return task;
  }, []);
  const patch = useCallback(
    (id: string, changes: Partial<Transfer>) =>
      commit((items) =>
        items.map((j) => (j.id === id ? { ...j, ...changes } : j)),
      ),
    [commit],
  );
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (running.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);
  useEffect(() => {
    if (!ready || paused || running.current) return;
    const job = jobs.find(
      (j) => j.status === "waiting" && selected.current.has(j.id),
    );
    if (!job) return;
    const controller = new AbortController();
    running.current = { id: job.id, controller };
    const file = selected.current.get(job.id)!;
    let mark = Date.now(),
      last = 0,
      shown = 0;
    (async () => {
      try {
        await patch(job.id, { status: "uploading", error: undefined });
        await runTransfer(
          projectId,
          job,
          file,
          controller.signal,
          (changes) => patch(job.id, changes),
          (loaded) => {
            const now = Date.now();
            if (now - shown < 150 && loaded !== job.size) return;
            shown = now;
            const bps = (loaded - last) / Math.max(0.1, (now - mark) / 1000);
            last = loaded;
            mark = now;
            if (mounted.current)
              setLive({
                loaded,
                bps: Math.max(0, bps),
                eta: bps > 0 ? (job.size - loaded) / bps : 0,
              });
          },
        );
        await patch(job.id, {
          status: "done",
          loaded: job.size,
          error: undefined,
        });
        selected.current.delete(job.id);
        if (mounted.current) load();
      } catch (e) {
        await patch(job.id, {
          status: controller.signal.aborted ? "paused" : "failed",
          error: controller.signal.aborted
            ? undefined
            : e instanceof Error
              ? e.message
              : "Transfer failed",
        }).catch(() => {});
      } finally {
        running.current = null;
        if (mounted.current) setJobs([...jobsRef.current]);
      }
    })();
  }, [jobs, paused, ready, projectId, patch, load]);
  async function pick(list: FileList | null) {
    if (!list?.length || !ready) return;
    setPicking(true);
    setError("");
    try {
      const additions: Transfer[] = [];
      const attached: string[] = [];
      for (const file of Array.from(list)) {
        const relative = sourcePath(file.webkitRelativePath || file.name);
        const hash = await fingerprint(file, relative);
        const previous = jobsRef.current.find(
          (j) =>
            j.fingerprint === hash && !["done", "cancelled"].includes(j.status),
        );
        if (previous) {
          selected.current.set(previous.id, file);
          attached.push(previous.id);
          continue;
        }
        const parent = relative.includes("/")
          ? relative.slice(0, relative.lastIndexOf("/"))
          : "";
        const destination = sourcePath(
          [path, parent].filter(Boolean).join("/"),
        );
        const item = newTransfer(file, relative, destination, hash);
        selected.current.set(item.id, file);
        additions.push(item);
      }
      await commit((old) => [
        ...old.map((j) =>
          attached.includes(j.id)
            ? { ...j, status: "waiting" as const, error: undefined }
            : j,
        ),
        ...additions,
      ]);
      setPaused(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not queue files");
    } finally {
      setPicking(false);
      if (fileInput.current) fileInput.current.value = "";
      if (folderInput.current) folderInput.current.value = "";
    }
  }
  async function makeFolder(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const name = sourcePath(newFolder.trim());
      if (!name || name.includes("/")) throw new Error("Enter one folder name");
      await api(projectId, {
        action: "folder",
        path: [path, name].filter(Boolean).join("/"),
      });
      setShowFolder(false);
      setNewFolder("");
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function resume(id: string) {
    if (!selected.current.has(id)) {
      setError(
        "Reselect the original files or folder using Upload files / Upload folder. Completed chunks will be reused.",
      );
      return;
    }
    await patch(id, { status: "waiting", error: undefined });
    setPaused(false);
  }
  async function cancel(job: Transfer) {
    if (
      !confirm(
        "Cancel this transfer and remove its unfinished uploaded chunks?",
      )
    )
      return;
    setPaused(true);
    if (running.current?.id === job.id) {
      running.current.controller.abort();
      setError(
        "Transfer paused. Press cancel again once it has stopped to remove unfinished chunks.",
      );
      return;
    }
    try {
      if (job.token) {
        const result = await api(projectId, {
          action: "cancel",
          token: job.token,
        });
        if (result.complete) {
          await patch(job.id, { status: "done", loaded: job.size });
          load();
          return;
        }
      } else {
        // Reconcile an interrupted start before cancellation, so no started upload is forgotten.
        const result = await api(projectId, {
          action: "start",
          transferId: job.id,
          path: job.path,
          name: job.name,
          size: job.size,
          fingerprint: job.fingerprint,
        });
        await patch(job.id, { token: result.token });
        if (result.complete) {
          await patch(job.id, { status: "done", loaded: job.size });
          load();
          return;
        }
        await api(projectId, { action: "cancel", token: result.token });
      }
      await patch(job.id, { status: "cancelled", loaded: 0, error: undefined });
      selected.current.delete(job.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function downloadFolder() {
    setDownloading(true);
    setError("");
    try {
      await downloadSourceFolder(projectId, path, setDownloadStatus);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  }
  async function remove(file: Entry) {
    if (!confirm(`Permanently delete ${file.name} and all stored copies?`))
      return;
    try {
      await api(projectId, { action: "delete", key: file.key });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const active = jobs.find((j) => j.status === "uploading"),
    completed = jobs.filter((j) => j.status === "done"),
    total = jobs
      .filter((j) => j.status !== "cancelled")
      .reduce((n, j) => n + j.size, 0),
    loaded =
      completed.reduce((n, j) => n + j.size, 0) + (active ? live.loaded : 0);
  return (
    <div className="space-y-5 text-white/70 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-light text-white/85">Source Media</h2>
          <p className="text-xs text-white/35 mt-1">
            Original camera footage, production audio, and shoot reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            disabled={downloading}
            onClick={downloadFolder}
          >
            <Download size={14} />
            {downloading ? "Downloading…" : "Download folder"}
          </button>
          <button className={button} onClick={() => setShowFolder((v) => !v)}>
            <FolderPlus size={14} />
            New folder
          </button>
          <button
            className={button}
            disabled={!ready || picking}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={14} />
            Upload files
          </button>
          <button
            className={button + " bg-white/10"}
            disabled={!ready || picking}
            onClick={() => folderInput.current?.click()}
          >
            <Folder size={14} />
            {picking ? "Preparing…" : "Upload folder"}
          </button>
          <input
            className="hidden"
            type="file"
            multiple
            ref={fileInput}
            onChange={(e) => pick(e.target.files)}
          />
          <input
            className="hidden"
            type="file"
            multiple
            {...{ webkitdirectory: "" }}
            ref={folderInput}
            onChange={(e) => pick(e.target.files)}
          />
        </div>
      </div>
      <div className="rounded-xl border border-white/8 bg-white/[.025] p-3 text-xs text-white/40 leading-relaxed">
        Upload a shoot day or camera card folder to keep its structure and
        original filenames. Keep this browser open and your computer awake
        during transfers. After reopening, select the same files or folder to
        resume. Unfinished chunks remain stored until resumed or cancelled.
      </div>
      {downloadStatus && (
        <p role="status" className="text-xs text-emerald-200/60">
          {downloadStatus}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="flex justify-between gap-3 rounded-xl border border-rose-400/20 p-3 text-xs text-rose-300"
        >
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {showFolder && (
        <form onSubmit={makeFolder} className="flex gap-2">
          <input
            aria-label="Folder name"
            autoFocus
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            placeholder="Day 01, Camera A, Production Audio…"
            required
          />
          <button className={button}>Create folder</button>
        </form>
      )}
      <nav
        aria-label="Source media folders"
        className="flex flex-wrap items-center gap-2 text-xs"
      >
        <button onClick={() => setPath("")} className="hover:text-white">
          All source media
        </button>
        {path
          .split("/")
          .filter(Boolean)
          .map((p, i) => (
            <span key={i} className="flex items-center gap-2">
              <ChevronRight size={12} />
              <button
                onClick={() =>
                  setPath(
                    path
                      .split("/")
                      .slice(0, i + 1)
                      .join("/"),
                  )
                }
              >
                {p}
              </button>
            </span>
          ))}
        <button
          className="ml-auto"
          aria-label="Refresh source files"
          onClick={() => load()}
        >
          <RotateCw size={13} />
        </button>
      </nav>
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-white/25 bg-white/[.025]">
          {folders.length} folders · {files.length} files{" "}
          {cursor ? "· more available" : ""}
        </div>
        {folders.map((f) => (
          <button
            key={f.path}
            onClick={() => setPath(f.path)}
            className="w-full flex items-center gap-3 px-4 py-3 border-t border-white/5 hover:bg-white/5 text-sm text-left"
          >
            <Folder size={18} className="text-amber-200/60" />
            <span className="flex-1 truncate">{f.name}</span>
            <ChevronRight size={14} />
          </button>
        ))}
        {files.map((f) => (
          <div
            key={f.key}
            className="flex items-center gap-3 px-4 py-3 border-t border-white/5 text-sm"
          >
            <File size={16} className="text-white/30" />
            <span className="flex-1 min-w-0 truncate" title={f.name}>
              {f.name}
            </span>
            <span className="text-xs text-white/30 shrink-0">
              {bytes(f.size)}
            </span>
            <a
              aria-label={`Download ${f.name}`}
              href={`/api/media?key=${encodeURIComponent(f.key)}&download=1`}
              className="p-2 hover:text-white"
            >
              <Download size={14} />
            </a>
            {canEdit && (
              <button
                aria-label={`Delete ${f.name}`}
                onClick={() => remove(f)}
                className="p-2 hover:text-rose-300"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {!files.length && !folders.length && (
          <div className="py-14 text-center">
            <Folder size={28} className="mx-auto mb-3 text-white/15" />
            <p className="text-sm text-white/40">
              {loading ? "Loading source media…" : "Organize your shoot here"}
            </p>
            <p className="text-xs text-white/20 mt-2">
              Start with Day 01, then add camera and audio folders—or upload
              your existing folder.
            </p>
          </div>
        )}
        {cursor && (
          <button
            className={button + " m-3"}
            disabled={loading}
            onClick={() => load(cursor)}
          >
            Load more
          </button>
        )}
      </div>
      {!!jobs.length && (
        <section className="rounded-2xl border border-white/10 p-4 space-y-3">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h3 className="text-sm">Transfer queue</h3>
              <p className="text-xs text-white/30 mt-1">
                {completed.length} of{" "}
                {jobs.filter((j) => j.status !== "cancelled").length} files
                verified · {bytes(loaded)} / {bytes(total)}
              </p>
            </div>
            <div className="flex gap-2">
              <button className={button} onClick={() => commit(old => old.filter(j => !['done','cancelled'].includes(j.status))).catch(e => setError(e.message))}>Clear finished</button>
            <button
                className={button}
                onClick={() => {
                  setPaused(true);
                  running.current?.controller.abort();
                }}
              >
                <Pause size={12} />
                Pause
              </button>
              <button
                className={button}
                onClick={async () => {
                  await commit((old) =>
                    old.map((j) =>
                      ["paused", "failed"].includes(j.status) &&
                      selected.current.has(j.id)
                        ? { ...j, status: "waiting", error: undefined }
                        : j,
                    ),
                  );
                  setPaused(false);
                }}
              >
                <Play size={12} />
                Resume
              </button>
            </div>
          </div>
          <div className="h-1 rounded bg-white/10 overflow-hidden">
            <div
              className="h-full bg-emerald-300/60"
              style={{
                width: `${total ? Math.min(100, (loaded / total) * 100) : 0}%`,
              }}
            />
          </div>
          {active && (
            <p className="text-xs text-white/40">
              {bytes(live.bps)}/s ·{" "}
              {live.eta > 0
                ? `${Math.ceil(live.eta / 60)} min remaining for current file`
                : "Calculating…"}
            </p>
          )}
          <div className="max-h-72 overflow-auto divide-y divide-white/5">
            {[
              ...jobs.filter((j) => j.status === "uploading"),
              ...jobs
                .filter((j) => j.status !== "uploading")
                .slice(0, queueLimit),
            ].map((j) => (
              <div key={j.id} className="flex gap-3 py-3 items-center text-xs">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-white/65" title={j.relative}>
                    {j.relative}
                  </p>
                  <p className="text-white/25 mt-1">
                    {bytes(j.size)} ·{" "}
                    {j.status === "done"
                      ? "Verified complete"
                      : j.status === "paused"
                        ? "Paused — reselect originals if needed"
                        : j.status}
                    {j.status === "uploading"
                      ? ` · ${Math.min(100, Math.floor((live.loaded / Math.max(1, j.size)) * 100))}%`
                      : ""}
                  </p>
                  {j.error && <p className="text-rose-300 mt-1">{j.error}</p>}
                </div>
                {j.status === "done" ? (
                  <CheckCircle2 size={15} className="text-emerald-300/70" />
                ) : (
                  j.status !== "cancelled" && (
                    <>
                      <button
                        aria-label={`Resume ${j.name}`}
                        className="p-2"
                        disabled={j.status === "uploading"}
                        onClick={() => resume(j.id)}
                      >
                        <Play size={14} />
                      </button>
                      <button
                        aria-label={`Cancel ${j.name}`}
                        className="p-2"
                        onClick={() => cancel(j)}
                      >
                        <X size={14} />
                      </button>
                    </>
                  )
                )}
              </div>
            ))}
          </div>
          {jobs.length > queueLimit && (
            <button
              className={button}
              onClick={() => setQueueLimit((n) => n + 100)}
            >
              Show more transfers
            </button>
          )}
          <p className="text-[11px] text-white/25">
            Transfers stay on this browser profile. Reselect originals after a
            restart. Completed files are checked against the expected byte size
            before appearing above.
          </p>
        </section>
      )}
      <details
        className="border-t border-white/5 pt-4"
        onToggle={(e) => setShowLegacy(e.currentTarget.open)}
      >
        <summary className="text-xs text-white/30 cursor-pointer">
          Existing project brief & reference documents
        </summary>
        {showLegacy && <div className="mt-5">{legacy}</div>}
      </details>
    </div>
  );
}
