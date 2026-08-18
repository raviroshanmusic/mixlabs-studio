import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { marked } from "marked";
import Link from "next/link";
import MixLabsLogo from "@/components/ui/MixLabsLogo";

// Legal pages render straight from the markdown in /legal, so the published
// policy and the reviewed document are the same file. Duplicating the text into
// JSX would mean the version a lawyer signed off and the version customers
// actually see could quietly drift apart — which is worse than having no policy,
// because what's published is a representation you've made.

const DOCS: Record<string, { file: string; title: string }> = {
  privacy:        { file: "privacy-policy.md",    title: "Privacy Policy" },
  terms:          { file: "terms-of-service.md",  title: "Terms of Service" },
  subprocessors:  { file: "subprocessors.md",     title: "Subprocessors" },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map(doc => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const entry = DOCS[doc];
  return { title: entry ? `${entry.title} · MixLabs` : "MixLabs" };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const entry = DOCS[doc];
  if (!entry) notFound();

  let markdown: string;
  try {
    markdown = await readFile(path.join(process.cwd(), "legal", entry.file), "utf8");
  } catch {
    notFound();
  }

  const html = await marked.parse(markdown, { gfm: true });

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-white/50 hover:text-white/80 transition-colors">
            <MixLabsLogo size={22} />
            <span className="text-[10px] tracking-[0.3em] uppercase font-light">MixLabs</span>
          </Link>
          <nav className="flex items-center gap-5 text-[10px] tracking-[0.15em] uppercase font-light">
            {Object.entries(DOCS).map(([slug, d]) => (
              <Link key={slug} href={`/legal/${slug}`}
                className={slug === doc ? "text-white/70" : "text-white/25 hover:text-white/50 transition-colors"}>
                {d.title}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Prose styling is done with arbitrary variants rather than adding the
          typography plugin — a handful of static pages doesn't justify it. */}
      <main
        className="max-w-3xl mx-auto px-6 py-14 font-light leading-relaxed text-white/60
          [&_h1]:text-3xl [&_h1]:font-extralight [&_h1]:text-white/90 [&_h1]:tracking-tight [&_h1]:mb-2
          [&_h2]:text-lg [&_h2]:font-light [&_h2]:text-white/85 [&_h2]:mt-12 [&_h2]:mb-3
          [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-white/75 [&_h3]:mt-8 [&_h3]:mb-2
          [&_p]:my-4 [&_p]:text-[14px]
          [&_ul]:my-4 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_li]:text-[14px] [&_li]:pl-1
          [&_ol]:my-4 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1.5
          [&_strong]:text-white/85 [&_strong]:font-medium
          [&_a]:text-white/75 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-white
          [&_hr]:border-white/[0.07] [&_hr]:my-10
          [&_code]:text-[12px] [&_code]:font-mono [&_code]:text-white/70 [&_code]:bg-white/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded
          [&_blockquote]:border-l-2 [&_blockquote]:border-amber-400/30 [&_blockquote]:bg-amber-400/[0.03] [&_blockquote]:pl-4 [&_blockquote]:pr-3 [&_blockquote]:py-2 [&_blockquote]:my-6 [&_blockquote]:text-[13px] [&_blockquote]:text-white/55
          [&_table]:w-full [&_table]:my-6 [&_table]:text-[13px] [&_table]:border-collapse
          [&_th]:text-left [&_th]:font-medium [&_th]:text-white/50 [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-[0.15em] [&_th]:pb-2 [&_th]:pr-4 [&_th]:border-b [&_th]:border-white/10
          [&_td]:py-2.5 [&_td]:pr-4 [&_td]:border-b [&_td]:border-white/[0.05] [&_td]:align-top"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <footer className="border-t border-white/[0.06] mt-10">
        <div className="max-w-3xl mx-auto px-6 py-8 flex items-center justify-between text-[10px] tracking-widest uppercase text-white/20 font-light">
          <span>MixLabs Studio</span>
          <Link href="/" className="hover:text-white/45 transition-colors">Back to site</Link>
        </div>
      </footer>
    </div>
  );
}
