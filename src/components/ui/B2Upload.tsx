"use client";
import { useState, useRef } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Film } from "lucide-react";

type Props = {
  projectId: string;
  onUploaded: (fileKey: string, filename: string) => void;
};

export default function B2Upload({ projectId, onUploaded }: Props) {
  const [dragging, setDragging]   = useState(false);
  const [progress, setProgress]   = useState<number | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [done, setDone]           = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    setDone(false);
    setProgress(0);

    // 1. Get presigned URL from our API
    const res = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type, projectId }),
    });
    if (!res.ok) { setError("Failed to get upload URL"); setProgress(null); return; }
    const { uploadUrl, fileKey } = await res.json();

    // 2. Upload directly to B2 via XHR (so we get progress events)
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(file);
    }).catch(e => { setError(e.message); setProgress(null); return; });

    if (error) return;
    setProgress(100);
    setDone(true);
    onUploaded(fileKey, file.name);
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    if (!file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
      setError("Only video and audio files are supported");
      return;
    }
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

      <input ref={inputRef} type="file" accept="video/*,audio/*" className="hidden"
        onChange={e => handleFiles(e.target.files)} />

      {done ? (
        <>
          <CheckCircle2 size={28} className="text-emerald-400" />
          <p className="text-emerald-300 text-sm font-medium">Upload complete</p>
        </>
      ) : error ? (
        <>
          <AlertCircle size={28} className="text-rose-400" />
          <p className="text-rose-300 text-sm">{error}</p>
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
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <Film size={22} className="text-white/30" />
          </div>
          <div className="text-center">
            <p className="text-white/60 text-sm font-medium">Drop file or tap to browse</p>
            <p className="text-white/25 text-xs mt-1">Video or audio · any size</p>
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
