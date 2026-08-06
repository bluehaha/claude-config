/**
 * Human-readable renderers for GitLab API responses.
 *
 * Each takes a parsed API object and returns a string for stdout. This is the
 * default output; `--json` bypasses these and prints the raw response instead.
 */

import type {
  GitLabApprovals,
  GitLabCommit,
  GitLabDiff,
  GitLabDiffPayload,
  GitLabMergeRequest,
  GitLabNote,
  GitLabUser,
} from '../types.ts';

/** GitLab returns ISO 8601; keep it compact and stable (no locale). */
function fmtDate(s: string | undefined | null): string {
  if (!s) return '';
  return String(s).replace('T', ' ').replace(/\.\d+.*$/, '').replace(/Z$/, ' UTC');
}

/** Display name for a user, preferring the full name over the handle. */
function who(user: GitLabUser | undefined): string {
  return user?.name || user?.username || '—';
}

export function formatMr(mr: GitLabMergeRequest): string {
  const lines = [
    `MR !${mr.iid}: ${mr.title}`,
    `State: ${mr.state}${mr.draft || mr.work_in_progress ? ' (draft)' : ''}`,
    `Author: ${who(mr.author)}`,
    `Source: ${mr.source_branch}  →  Target: ${mr.target_branch}`,
  ];
  if (mr.assignees?.length) {
    lines.push(`Assignees: ${mr.assignees.map((a) => a.name || a.username).join(', ')}`);
  }
  if (mr.reviewers?.length) {
    lines.push(`Reviewers: ${mr.reviewers.map((r) => r.name || r.username).join(', ')}`);
  }
  if (mr.labels?.length) lines.push(`Labels: ${mr.labels.join(', ')}`);
  lines.push(`Merge status: ${mr.detailed_merge_status || mr.merge_status || '—'}`);
  lines.push(`Created: ${fmtDate(mr.created_at)}  Updated: ${fmtDate(mr.updated_at)}`);
  if (mr.web_url) lines.push(`URL: ${mr.web_url}`);
  lines.push('');
  lines.push('Description:');
  lines.push(mr.description?.trim() ? mr.description.trim() : '(none)');
  return lines.join('\n');
}

export function formatNotes(notes: GitLabNote[]): string {
  const real = notes.filter((n) => !n.system); // drop system events (label added, etc.)
  if (!real.length) return 'No comments.';
  const out = real.map(
    (n) =>
      `[${fmtDate(n.created_at)}] ${who(n.author)} (note ${n.id}):\n  ${(n.body || '').replace(/\n/g, '\n  ')}`,
  );
  out.push(
    `\nTotal: ${real.length} comment(s)` +
      (real.length !== notes.length
        ? ` (${notes.length - real.length} system events hidden)`
        : ''),
  );
  return out.join('\n\n');
}

export function formatCommits(commits: GitLabCommit[]): string {
  if (!commits.length) return 'No commits.';
  const out = commits.map(
    (c) =>
      `${c.short_id}  ${c.title}\n  ${c.author_name} · ${fmtDate(c.created_at || c.committed_date)}`,
  );
  out.push(`\nTotal: ${commits.length} commit(s)`);
  return out.join('\n');
}

export function formatDiffs(payload: GitLabDiffPayload): string {
  // /diffs returns an array of diff objects; /changes returns { changes: [...] }.
  const changes: GitLabDiff[] = Array.isArray(payload) ? payload : payload.changes || [];
  if (!changes.length) return 'No changes.';
  const out = changes.map((c) => {
    const flag = c.new_file
      ? '[new]'
      : c.deleted_file
        ? '[deleted]'
        : c.renamed_file
          ? '[renamed]'
          : '';
    const path = c.new_path || c.old_path;
    const header = `--- ${path} ${flag}`.trim();
    return `${header}\n${c.diff || ''}`;
  });
  out.push(`\nTotal: ${changes.length} file(s) changed`);
  return out.join('\n');
}

export function formatApprovals(a: GitLabApprovals): string {
  const lines = [
    `Approvals: ${a.approved_by?.length || 0} of ${a.approvals_required ?? '—'} required`,
  ];
  lines.push(`Approved: ${a.approved ? 'yes' : 'no'}`);
  if (a.approved_by?.length) {
    lines.push(
      `Approved by: ${a.approved_by.map((x) => x.user?.name || x.user?.username).join(', ')}`,
    );
  }
  if (a.approvals_left !== undefined) lines.push(`Approvals left: ${a.approvals_left}`);
  return lines.join('\n');
}

export function formatUser(u: GitLabUser): string {
  return `${u.name} (@${u.username})  id=${u.id}  ${u.email || ''}`.trim();
}
