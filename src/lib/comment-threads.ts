export type ThreadComment = {
  id: string; parent_comment_id?: string | null; created_at: string;
};

// Replies count as conversation, not new timecoded tasks to resolve.
export function groupReplies<T extends ThreadComment>(comments: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const comment of comments) {
    if (!comment.parent_comment_id) continue;
    (groups[comment.parent_comment_id] ??= []).push(comment);
  }
  for (const replies of Object.values(groups)) {
    replies.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  }
  return groups;
}

export function topLevelComments<T extends ThreadComment>(comments: T[]): T[] {
  return comments.filter(comment => !comment.parent_comment_id);
}
