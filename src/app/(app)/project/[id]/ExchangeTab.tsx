"use client";
import { useState } from "react";
import { Download, Trash2, FileCode, Film, AudioLines, FileBox, Boxes } from "lucide-react";
import B2Upload from "@/components/ui/B2Upload";

export type ExchangeFile = {
  id: string;
  title: string | null;
  kind: string | null;
  notes: string | null;
  file_key: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
};

const mediaUrl = (key: string) => `/api/media?key=${encodeURIComponent(key)}&download=1`;

function formatBytes(n?: number | null): string {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB", "TB"]; let i = -1; let v = n;
  do { v /= 1024; i++; } while (v >= 1024 && i < u.length - 1);
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

function kindIcon(kind?: string | null) {
  switch (kind) {
    case "MOV":   return <Film size={15} />;
    case "AUDIO": return <AudioLines size={15} />;
    case "AAF":   return <Boxes size={15} />;
    case "XML":
    case "EDL":   return <FileCode size={15} />;
    default:      return <FileBox size={15} />;
  }
}

// Editorial turnover / interchange formats plus reference media.
const ACCEPT = ".aaf,.omf,.fcpxml,.xml,.otio,.drt,.edl,.ale,.cdl,.ccc,.mov,.mp4,.mkv,.webm,.wav,.aif,.aiff,.mp3,.flac,video/*,audio/*";
const OK_EXT = new Set(["aaf","omf","fcpxml","xml","otio","drt","edl","ale","cdl","ccc","mov","mp4","mkv","webm","wav","aif","aiff","mp3","flac","m4a","aac"]);
function validateExchange(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return OK_EXT.has(ext) ? null : "Unsupported file. Use AAF, XML/FCPXML, EDL, OTIO, MOV, WAV, etc.";
}

export default function ExchangeTab({
  projectId, initialFiles, currentUserId, canEdit,
}: {
  projectId: string;
  initialFiles: ExchangeFile[];
  currentUserId: string;
  canEdit: boolean;
}) {
  const [files, setFiles] = useState<ExchangeFile[]>(initialFiles);
  const [error, setError] = useState("");

  async function handleUploaded(fileKey: string, fileName: string, fileSize: number) {
    setError("");
    const res = await fetch(`/api/projects/${projectId}/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_key: fileKey, file_name: fileName, file_size: fileSize }),
    });
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || "Failed to save file"); return; }
    const created: ExchangeFile = await res.json();
    setFiles(prev => [created, ...prev]);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this file?")) return;
    const prev = files;
    setFiles(f => f.filter(x => x.id !== id));
    const res = await fetch(`/api/projects/${projectId}/exchange/${id}`, { method: "DELETE" });
    if (!res.ok) setFiles(prev); // revert on failure
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Intro */}
      <div>
        <h2 className="text-white/80 text-base font-light">Handoff</h2>
        <p className="text-white/30 text-xs font-light mt-1">
          Drop editorial turnover here — AAF, XML / FCPXML, EDL, OTIO, reference MOVs, audio stems.
        </p>
      </div>

      {/* Drop zone */}
      <B2Upload
        projectId={projectId}
        folder="exchange"
        onUploaded={handleUploaded}
        accept={ACCEPT}
        validate={validateExchange}
        hint="AAF · XML / FCPXML · EDL · OTIO · MOV · WAV · any size"
        icon={<Boxes size={22} />}
      />
      {error && <p className="text-rose-400/80 text-xs -mt-2">{error}</p>}

      {/* File list */}
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 border border-dashed border-white/[0.06] rounded-2xl">
          <FileBox size={22} className="text-white/10" />
          <p className="text-white/18 text-sm font-light">No exchange files yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {files.map(f => {
            const canRemove = canEdit || f.uploaded_by === currentUserId;
            return (
              <div key={f.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-transparent hover:border-white/[0.05] hover:bg-white/[0.02] transition-all group">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 shrink-0">
                  {kindIcon(f.kind)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white/70 text-[13px] font-light truncate">{f.title || f.file_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {f.kind && <span className="text-[9px] tracking-wide uppercase px-1.5 py-0.5 rounded border border-white/10 text-white/35 font-light">{f.kind}</span>}
                    <span className="text-white/22 text-[10px] font-light truncate">
                      {f.file_name}{f.file_size ? ` · ${formatBytes(f.file_size)}` : ""}
                    </span>
                  </div>
                </div>
                <a href={mediaUrl(f.file_key)}
                  className="shrink-0 flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/75 border border-white/[0.07] hover:border-white/[0.16] px-3 py-1.5 rounded-lg transition-all font-light">
                  <Download size={11} /> Download
                </a>
                {canRemove && (
                  <button onClick={() => handleDelete(f.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Remove">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
