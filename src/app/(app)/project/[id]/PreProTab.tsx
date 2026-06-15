"use client";
import { useState } from "react";
import {
  ScrollText, BookOpen, Palette, NotebookPen, Music, Mic, Film,
  ClipboardList, Clapperboard, MessageSquare, ListMusic, Volume2,
  Package, FileText, Plus, Trash2, X, Check, Pencil, Link2,
  ExternalLink, Download, Upload, FileUp, Sparkles,
} from "lucide-react";
import B2Upload from "@/components/ui/B2Upload";

// ─── Types ──────────────────────────────────────────────────────────────────

type Project = {
  id: string;
  name: string;
  departments: string[];
  logline?: string | null;
  synopsis?: string | null;
  brief?: Record<string, string> | null;
};

export type ProjectDoc = {
  id: string;
  category: string;
  title: string;
  notes: string | null;
  department: string | null;
  file_key: string | null;
  file_name: string | null;
  file_size: number | null;
  link_url: string | null;
  created_at: string;
};

// ─── Film-industry document taxonomy ──────────────────────────────────────────

type CatItem = { id: string; label: string; icon: React.ReactNode };
const ICON = (C: React.ElementType) => <C size={14} />;

const DOC_GROUPS: { group: string; items: CatItem[] }[] = [
  {
    group: "Story & Creative",
    items: [
      { id: "script",         label: "Script / Screenplay",     icon: ICON(ScrollText) },
      { id: "treatment",      label: "Synopsis / Treatment",    icon: ICON(BookOpen) },
      { id: "mood_board",     label: "Mood Board / Look Book",  icon: ICON(Palette) },
      { id: "director_notes", label: "Director's Notes",        icon: ICON(NotebookPen) },
      { id: "temp_music",     label: "Temp Music / References", icon: ICON(Music) },
    ],
  },
  {
    group: "Production Logs",
    items: [
      { id: "sound_report",   label: "Sound Report",            icon: ICON(Mic) },
      { id: "camera_report",  label: "Camera Report",           icon: ICON(Film) },
      { id: "continuity",     label: "Continuity / Lined Script", icon: ICON(ClipboardList) },
      { id: "call_sheet",     label: "Call Sheet",              icon: ICON(Clapperboard) },
    ],
  },
  {
    group: "Post & Turnover",
    items: [
      { id: "conform",        label: "EDL / XML / AAF (Conform)", icon: ICON(Film) },
      { id: "spotting",       label: "Spotting Notes",          icon: ICON(MessageSquare) },
      { id: "cue_sheet",      label: "Music Cue Sheet (Q Sheet)", icon: ICON(ListMusic) },
      { id: "dialogue_list",  label: "Dialogue / ADR List",     icon: ICON(Volume2) },
      { id: "deliverable_spec", label: "Deliverables Spec",     icon: ICON(Package) },
    ],
  },
  {
    group: "Other",
    items: [
      { id: "contract",       label: "Contract / Agreement",    icon: ICON(FileText) },
      { id: "other",          label: "Other Reference",         icon: ICON(FileText) },
    ],
  },
];

const CAT_META: Record<string, { label: string; icon: React.ReactNode; group: string }> = {};
for (const g of DOC_GROUPS) for (const it of g.items) CAT_META[it.id] = { label: it.label, icon: it.icon, group: g.group };

const SPEC_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "format",            label: "Format",            placeholder: "Feature Film" },
  { key: "genre",             label: "Genre",             placeholder: "Psychological Thriller" },
  { key: "runtime",           label: "Runtime",           placeholder: "1h 48m" },
  { key: "frame_rate",        label: "Frame Rate",        placeholder: "24 fps" },
  { key: "aspect_ratio",      label: "Aspect Ratio",      placeholder: "2.39:1" },
  { key: "language",          label: "Language",          placeholder: "Nepali" },
  { key: "audio_deliverable", label: "Audio Deliverable", placeholder: "5.1 Surround" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(n: number | null): string {
  if (!n || n <= 0) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

function linkHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "link"; }
}

const DOC_ACCEPT = [
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.pages,.key,.numbers,.txt,.csv,.rtf",
  ".jpg,.jpeg,.png,.gif,.webp,.tif,.tiff,.heic",
  ".edl,.aaf,.omf,.fcpxml,.xml,.otio,.drt,.ale,.cdl,.ccc,.fdx,.fountain",
  ".mp3,.wav,.aif,.aiff,.flac,.m4a,.mov,.mp4",
].join(",");

const DANGEROUS = new Set(["html","htm","xhtml","shtml","svg","js","mjs","jsx","php","sh","exe","bat","cmd","vbs","jar"]);
const validateDoc = (file: File): string | null => {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  return DANGEROUS.has(ext) ? "That file type isn't allowed" : null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PreProTab({
  project, initialDocuments, canEdit, onProjectUpdate,
}: {
  project: Project;
  initialDocuments: ProjectDoc[];
  canEdit: boolean;
  onProjectUpdate: (p: Partial<Project>) => void;
}) {
  const [docs, setDocs] = useState<ProjectDoc[]>(initialDocuments);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <Brief project={project} canEdit={canEdit} onProjectUpdate={onProjectUpdate} />

      {/* ── Documents ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white/70 text-sm font-light tracking-wide">Reference Documents</h3>
            <p className="text-white/22 text-[11px] font-light mt-0.5">
              Scripts, mood boards, sound &amp; camera reports, conform, spotting notes, cue sheets.
            </p>
          </div>
          {canEdit && !adding && (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-[11px] text-white/55 hover:text-white/85 border border-white/10 hover:border-white/25 px-3 py-2 rounded-xl transition-all font-light">
              <Plus size={12}/> Add document
            </button>
          )}
        </div>

        {adding && (
          <AddDoc
            project={project}
            onCancel={() => setAdding(false)}
            onAdded={(d) => { setDocs(prev => [d, ...prev]); setAdding(false); }}
          />
        )}

        {docs.length === 0 && !adding ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 rounded-2xl border border-dashed border-white/8">
            <FileUp size={26} className="text-white/12"/>
            <p className="text-white/30 text-sm font-light">No documents yet</p>
            <p className="text-white/18 text-xs font-light">Add the script, mood board, or any reference the post team needs.</p>
          </div>
        ) : (
          <DocList docs={docs} canEdit={canEdit} onDelete={(id) => setDocs(prev => prev.filter(d => d.id !== id))} projectId={project.id} />
        )}
      </div>
    </div>
  );
}

// ─── Brief block ──────────────────────────────────────────────────────────────

function Brief({ project, canEdit, onProjectUpdate }: {
  project: Project; canEdit: boolean; onProjectUpdate: (p: Partial<Project>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [logline, setLogline]   = useState(project.logline ?? "");
  const [synopsis, setSynopsis] = useState(project.synopsis ?? "");
  const [brief, setBrief]       = useState<Record<string, string>>(project.brief ?? {});

  const specsFilled = SPEC_FIELDS.filter(f => (project.brief?.[f.key] ?? "").trim());
  const hasContent  = !!(project.logline?.trim() || project.synopsis?.trim() || specsFilled.length);

  async function save() {
    setSaving(true);
    const cleanBrief: Record<string, string> = {};
    for (const f of SPEC_FIELDS) {
      const v = (brief[f.key] ?? "").trim();
      if (v) cleanBrief[f.key] = v;
    }
    const payload = {
      logline: logline.trim() || null,
      synopsis: synopsis.trim() || null,
      brief: cleanBrief,
    };
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) { onProjectUpdate(payload); setEditing(false); }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-white/35"/>
          <h3 className="text-white/70 text-sm font-light tracking-wide">Project Brief</h3>
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/75 transition-colors font-light">
            <Pencil size={11}/> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
          <Field label="Logline">
            <textarea value={logline} onChange={e => setLogline(e.target.value)} rows={2}
              placeholder="One or two sentences that capture the film."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:border-white/25 resize-none font-light"/>
          </Field>
          <Field label="Synopsis">
            <textarea value={synopsis} onChange={e => setSynopsis(e.target.value)} rows={4}
              placeholder="A short paragraph on the story, tone, and what the post team should know."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:border-white/25 resize-none font-light"/>
          </Field>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SPEC_FIELDS.map(f => (
              <Field key={f.key} label={f.label}>
                <input value={brief[f.key] ?? ""} onChange={e => setBrief(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:border-white/25 font-light"/>
              </Field>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 text-[12px] bg-white/90 hover:bg-white text-black px-4 py-2 rounded-xl transition-all disabled:opacity-40 font-medium">
              <Check size={13}/> {saving ? "Saving…" : "Save brief"}
            </button>
            <button onClick={() => {
              setLogline(project.logline ?? ""); setSynopsis(project.synopsis ?? "");
              setBrief(project.brief ?? {}); setEditing(false);
            }}
              className="text-[12px] text-white/40 hover:text-white/70 px-3 py-2 transition-colors font-light">Cancel</button>
          </div>
        </div>
      ) : !hasContent ? (
        <p className="text-white/25 text-sm font-light">
          {canEdit ? "No brief yet. Add the logline, synopsis, and key specs so every department starts on the same page." : "No brief has been added yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {project.logline?.trim() && (
            <p className="text-white/80 text-[15px] leading-relaxed font-light italic">“{project.logline}”</p>
          )}
          {project.synopsis?.trim() && (
            <p className="text-white/50 text-sm leading-relaxed font-light whitespace-pre-wrap">{project.synopsis}</p>
          )}
          {specsFilled.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {specsFilled.map(f => (
                <div key={f.key} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                  <p className="text-white/20 text-[9px] tracking-[0.18em] uppercase font-light">{f.label}</p>
                  <p className="text-white/72 text-sm font-light mt-0.5">{project.brief?.[f.key]}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-white/30 text-[10px] tracking-[0.18em] uppercase mb-1.5 font-light">{label}</label>
      {children}
    </div>
  );
}

// ─── Add document ─────────────────────────────────────────────────────────────

function AddDoc({ project, onCancel, onAdded }: {
  project: Project; onCancel: () => void; onAdded: (d: ProjectDoc) => void;
}) {
  const [category, setCategory]   = useState("script");
  const [title, setTitle]         = useState("");
  const [department, setDepartment] = useState("");
  const [notes, setNotes]         = useState("");
  const [mode, setMode]           = useState<"upload" | "link">("upload");
  const [fileKey, setFileKey]     = useState("");
  const [fileName, setFileName]   = useState("");
  const [fileSize, setFileSize]   = useState<number | null>(null);
  const [linkUrl, setLinkUrl]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const ready = title.trim() && (mode === "upload" ? !!fileKey : !!linkUrl.trim());

  async function save() {
    if (!ready) return;
    setSaving(true); setError("");
    const body = {
      category, title: title.trim(),
      department: department || null,
      notes: notes.trim() || null,
      file_key: mode === "upload" ? fileKey : null,
      file_name: mode === "upload" ? fileName : null,
      file_size: mode === "upload" ? fileSize : null,
      link_url: mode === "link" ? linkUrl.trim() : null,
    };
    const res = await fetch(`/api/projects/${project.id}/documents`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to add"); setSaving(false); return; }
    onAdded(data);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-white/70 text-sm font-light">Add document</h4>
        <button onClick={onCancel} className="text-white/30 hover:text-white/70 transition-colors"><X size={15}/></button>
      </div>

      <div className="flex flex-col gap-3.5">
        <Field label="Type">
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 focus:outline-none focus:border-white/25 font-light">
            {DOC_GROUPS.map(g => (
              <optgroup key={g.group} label={g.group} className="bg-[#141414]">
                {g.items.map(it => <option key={it.id} value={it.id} className="bg-[#141414]">{it.label}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field label="Title">
          <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
            placeholder="e.g. Locked shooting script v4"
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:border-white/25 font-light"/>
        </Field>

        {project.departments.length > 0 && (
          <Field label="Department (optional)">
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setDepartment("")}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all font-light ${department === "" ? "border-white/30 bg-white/10 text-white/80" : "border-white/8 text-white/35 hover:text-white/60"}`}>None</button>
              {project.departments.map(d => (
                <button key={d} onClick={() => setDepartment(d)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all font-light ${department === d ? "border-white/30 bg-white/10 text-white/80" : "border-white/8 text-white/35 hover:text-white/60"}`}>{d}</button>
              ))}
            </div>
          </Field>
        )}

        {/* Upload vs link toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/8 w-fit">
          <button onClick={() => setMode("upload")}
            className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-all font-light ${mode === "upload" ? "bg-white/10 text-white/85" : "text-white/35 hover:text-white/60"}`}>
            <Upload size={11}/> Upload file
          </button>
          <button onClick={() => setMode("link")}
            className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-all font-light ${mode === "link" ? "bg-white/10 text-white/85" : "text-white/35 hover:text-white/60"}`}>
            <Link2 size={11}/> Paste link
          </button>
        </div>

        {mode === "upload" ? (
          fileKey ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-500/[0.04] px-3.5 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Check size={14} className="text-emerald-400 shrink-0"/>
                <span className="text-white/75 text-sm font-light truncate">{fileName}</span>
                {fileSize ? <span className="text-white/30 text-xs shrink-0">{formatBytes(fileSize)}</span> : null}
              </div>
              <button onClick={() => { setFileKey(""); setFileName(""); setFileSize(null); }}
                className="text-white/30 hover:text-white/70 transition-colors shrink-0"><X size={14}/></button>
            </div>
          ) : (
            <B2Upload
              projectId={project.id}
              folder="docs"
              accept={DOC_ACCEPT}
              hint="PDF, images, scripts, EDL / AAF, cue sheets · any size"
              icon={<FileUp size={22}/>}
              validate={validateDoc}
              onUploaded={(key, name, size) => { setFileKey(key); setFileName(name); setFileSize(size); }}
            />
          )
        ) : (
          <Field label="Link">
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://drive.google.com/…"
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:border-white/25 font-light"/>
          </Field>
        )}

        <Field label="Notes (optional)">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Anything the team should know about this document."
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/85 placeholder:text-white/20 focus:outline-none focus:border-white/25 resize-none font-light"/>
        </Field>

        {error && <p className="text-rose-400/80 text-xs">{error}</p>}

        <div className="flex items-center gap-2 pt-0.5">
          <button onClick={save} disabled={!ready || saving}
            className="flex items-center gap-1.5 text-[12px] bg-white/90 hover:bg-white text-black px-4 py-2 rounded-xl transition-all disabled:opacity-30 font-medium">
            <Check size={13}/> {saving ? "Adding…" : "Add document"}
          </button>
          <button onClick={onCancel} className="text-[12px] text-white/40 hover:text-white/70 px-3 py-2 transition-colors font-light">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Document list ────────────────────────────────────────────────────────────

function DocList({ docs, canEdit, onDelete, projectId }: {
  docs: ProjectDoc[]; canEdit: boolean; onDelete: (id: string) => void; projectId: string;
}) {
  // Keep the curated group order; only render groups that have documents.
  const byGroup = DOC_GROUPS.map(g => ({
    group: g.group,
    docs: docs.filter(d => CAT_META[d.category]?.group === g.group),
  })).filter(g => g.docs.length > 0);

  // Anything with an unknown category falls into a trailing bucket.
  const known = new Set(Object.keys(CAT_META));
  const orphans = docs.filter(d => !known.has(d.category));
  if (orphans.length) byGroup.push({ group: "Other", docs: orphans });

  return (
    <div className="flex flex-col gap-5">
      {byGroup.map(g => (
        <div key={g.group}>
          <p className="text-white/20 text-[10px] tracking-[0.2em] uppercase mb-2 font-light">{g.group}</p>
          <div className="flex flex-col gap-2">
            {g.docs.map(d => <DocRow key={d.id} doc={d} canEdit={canEdit} onDelete={onDelete} projectId={projectId} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocRow({ doc, canEdit, onDelete, projectId }: {
  doc: ProjectDoc; canEdit: boolean; onDelete: (id: string) => void; projectId: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const meta = CAT_META[doc.category] ?? { label: doc.category, icon: <FileText size={14}/>, group: "Other" };

  const href = doc.file_key
    ? `/api/media?key=${encodeURIComponent(doc.file_key)}`
    : doc.link_url ?? "#";

  async function remove() {
    if (!confirm(`Remove "${doc.title}"?`)) return;
    setDeleting(true);
    onDelete(doc.id);
    await fetch(`/api/projects/${projectId}/documents/${doc.id}`, { method: "DELETE" });
  }

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] px-3.5 py-3 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 shrink-0">
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white/80 text-sm font-light truncate">{doc.title}</p>
          {doc.department && (
            <span className="text-[9px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/45 font-light shrink-0">{doc.department}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/28 font-light mt-0.5">
          <span>{meta.label}</span>
          {doc.file_key ? (
            <>
              <span className="text-white/12">·</span>
              <span className="truncate">{doc.file_name}{doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ""}</span>
            </>
          ) : doc.link_url ? (
            <>
              <span className="text-white/12">·</span>
              <span className="flex items-center gap-1"><Link2 size={9}/>{linkHost(doc.link_url)}</span>
            </>
          ) : null}
        </div>
        {doc.notes && <p className="text-white/30 text-xs font-light mt-1 line-clamp-2">{doc.notes}</p>}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/80 border border-white/8 hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-all font-light">
          {doc.file_key ? <Download size={11}/> : <ExternalLink size={11}/>}
          <span className="hidden sm:inline">{doc.file_key ? "Open" : "Open link"}</span>
        </a>
        {canEdit && (
          <button onClick={remove} disabled={deleting}
            className="text-white/20 hover:text-rose-400/80 p-1.5 rounded-lg transition-colors disabled:opacity-40"
            title="Remove"><Trash2 size={13}/></button>
        )}
      </div>
    </div>
  );
}
