import { redirect } from "next/navigation";

// Clicking "Projects" in the sidebar lands here.
// The dashboard is the project hub (grid + filters + search), so send users there.
// Having this page means /project is never a 404 — direct visits & bookmarks work too.
export default function ProjectIndexPage() {
  redirect("/dashboard");
}
