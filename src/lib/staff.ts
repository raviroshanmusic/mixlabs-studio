// MixLabs is an internal tool: only staff create projects; clients are invited
// into existing ones. This is the single source of truth for "who is staff".
// To add/remove staff, edit this list (and the projects INSERT policy in
// supabase-migration-staff.sql, which mirrors it as a DB-level backstop).
export const STAFF_EMAILS: readonly string[] = [
  "rajputraviroshan@gmail.com",
  "mixlabscreative@gmail.com",
];

export function isStaffEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return STAFF_EMAILS.includes(email.trim().toLowerCase());
}
