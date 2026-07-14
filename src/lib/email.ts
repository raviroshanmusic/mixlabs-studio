// Transactional email via Resend (REST API — no SDK dependency).
// Sends notifications for new drafts and new review comments to the people on a
// project, honouring each person's notification preferences.
import type { SupabaseClient } from "@supabase/supabase-js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM     = "MixLabs Workspace <noreply@updates.mixlabscreative.com>";
const APP_URL  = "https://project.mixlabscreative.com";

// ── Low-level send (one email per recipient so nobody sees the others) ──────────
async function sendMail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) { console.warn("RESEND_API_KEY not set — skipping email"); return; }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) console.error("Resend send failed:", res.status, await res.text());
  } catch (e) {
    console.error("Resend send error:", e);
  }
}

// ── Branded HTML shell ──────────────────────────────────────────────────────────
function shell(heading: string, lines: string[], ctaLabel: string, ctaUrl: string) {
  const body = lines.map(l => `<p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6">${l}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden">
      <div style="padding:20px 28px;border-bottom:1px solid #f0f0f1">
        <span style="font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#71717a;font-weight:600">MixLabs Workspace</span>
      </div>
      <div style="padding:28px">
        <h1 style="margin:0 0 16px;font-size:18px;color:#18181b;font-weight:600">${heading}</h1>
        ${body}
        <a href="${ctaUrl}" style="display:inline-block;margin-top:8px;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:10px">${ctaLabel}</a>
      </div>
      <div style="padding:16px 28px;border-top:1px solid #f0f0f1">
        <p style="margin:0;color:#a1a1aa;font-size:11px">You're receiving this because you're on this project in MixLabs Workspace. Manage notifications in your profile.</p>
      </div>
    </div>
  </body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// ── Resolve who to notify (owner + members), minus the actor, honouring prefs ────
async function getRecipients(
  supabase: SupabaseClient, projectId: string, actorId: string, prefKey: "notify_new_version" | "notify_new_comment",
): Promise<string[]> {
  const { data: project } = await supabase.from("projects").select("owner_id").eq("id", projectId).single();
  const { data: members } = await supabase.from("project_members").select("user_id, email").eq("project_id", projectId);

  const ids = new Set<string>();
  const looseEmails: string[] = []; // invited members who haven't signed up (no profile → no pref)
  if (project?.owner_id) ids.add(project.owner_id);
  for (const m of members ?? []) {
    if (m.user_id) ids.add(m.user_id);
    else if (m.email) looseEmails.push(m.email);
  }
  ids.delete(actorId); // never notify the person who took the action

  const emails = new Set<string>();
  const idList = [...ids];
  if (idList.length) {
    const { data: profiles } = await supabase.from("profiles").select(`id, email, ${prefKey}`).in("id", idList);
    for (const p of (profiles ?? []) as Array<Record<string, unknown>>) {
      if (p[prefKey] === false) continue;                 // respect opt-out
      const email = p.email as string | null;
      if (email) emails.add(email.toLowerCase());
    }
  }
  for (const e of looseEmails) emails.add(e.toLowerCase());
  return [...emails];
}

// ── Public: new draft uploaded ──────────────────────────────────────────────────
export async function notifyNewVersion(
  supabase: SupabaseClient,
  opts: { projectId: string; actorId: string; department: string; versionName: string },
) {
  const [{ data: project }, { data: actor }, recipients] = await Promise.all([
    supabase.from("projects").select("name").eq("id", opts.projectId).single(),
    supabase.from("profiles").select("full_name").eq("id", opts.actorId).single(),
    getRecipients(supabase, opts.projectId, opts.actorId, "notify_new_version"),
  ]);
  if (recipients.length === 0) return;

  const projectName = project?.name ?? "your project";
  const who = actor?.full_name ? escapeHtml(actor.full_name) : "A team member";
  const subject = `New ${opts.department} draft on ${projectName}`;
  const html = shell(
    `New ${escapeHtml(opts.department)} draft uploaded`,
    [
      `${who} uploaded <strong>${escapeHtml(opts.versionName)}</strong> to <strong>${escapeHtml(projectName)}</strong> (${escapeHtml(opts.department)}).`,
      `Open the project to review it.`,
    ],
    "View draft",
    `${APP_URL}/project/${opts.projectId}`,
  );
  await Promise.allSettled(recipients.map(to => sendMail(to, subject, html)));
}

// ── Public: added to a project (invite) ──────────────────────────────────────────
// Two flavours: the person already has an account (project is on their dashboard
// now), or they don't yet (sign up with this email and it appears automatically).
export async function notifyProjectInvite(
  supabase: SupabaseClient,
  opts: { projectId: string; email: string; inviterId: string; isNewUser: boolean },
) {
  const [{ data: project }, { data: inviter }] = await Promise.all([
    supabase.from("projects").select("name").eq("id", opts.projectId).single(),
    supabase.from("profiles").select("full_name").eq("id", opts.inviterId).single(),
  ]);

  const projectName = project?.name ?? "a project";
  const who = inviter?.full_name ? escapeHtml(inviter.full_name) : "The MixLabs team";

  const subject = opts.isNewUser
    ? `You're invited to ${projectName} on MixLabs Workspace`
    : `You've been added to ${projectName}`;

  const html = opts.isNewUser
    ? shell(
        `You've been invited to ${escapeHtml(projectName)}`,
        [
          `${who} invited you to collaborate on <strong>${escapeHtml(projectName)}</strong> in MixLabs Workspace.`,
          `Create an account using <strong>this email address</strong> and the project will appear on your dashboard automatically.`,
        ],
        "Create your account",
        `${APP_URL}/login`,
      )
    : shell(
        `You've been added to ${escapeHtml(projectName)}`,
        [
          `${who} added you to <strong>${escapeHtml(projectName)}</strong> in MixLabs Workspace.`,
          `It's on your dashboard now.`,
        ],
        "Open project",
        `${APP_URL}/project/${opts.projectId}`,
      );

  await sendMail(opts.email, subject, html);
}

// ── Public: new review comment ───────────────────────────────────────────────────
// NOTE: currently NOT wired up. Per-comment emails were too noisy (one email per
// member, per note — a 10-person project floods inboxes during a review). Kept
// here deliberately: re-wire in the comments route, or fold into a batched digest.
export async function notifyNewComment(
  supabase: SupabaseClient,
  opts: { projectId: string; actorId: string; department: string; versionName: string; authorName: string; body: string },
) {
  const [{ data: project }, recipients] = await Promise.all([
    supabase.from("projects").select("name").eq("id", opts.projectId).single(),
    getRecipients(supabase, opts.projectId, opts.actorId, "notify_new_comment"),
  ]);
  if (recipients.length === 0) return;

  const projectName = project?.name ?? "your project";
  const snippet = opts.body.length > 140 ? opts.body.slice(0, 140) + "…" : opts.body;
  const subject = `${opts.authorName} left a note on ${projectName}`;
  const html = shell(
    `New note on ${escapeHtml(projectName)}`,
    [
      `<strong>${escapeHtml(opts.authorName)}</strong> commented on <strong>${escapeHtml(opts.versionName)}</strong> (${escapeHtml(opts.department)}).`,
      `“${escapeHtml(snippet)}”`,
    ],
    "Open review room",
    `${APP_URL}/review/${opts.projectId}?dept=${encodeURIComponent(opts.department)}`,
  );
  await Promise.allSettled(recipients.map(to => sendMail(to, subject, html)));
}
