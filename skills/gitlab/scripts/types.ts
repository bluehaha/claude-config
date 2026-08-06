/**
 * GitLab API v4 domain models.
 *
 * These describe the parts of the API responses this skill reads or forwards.
 * They are deliberately non-exhaustive: GitLab adds fields over time, so every
 * object carries an index signature and all but the essential fields are
 * optional. That keeps the types useful for autocomplete without breaking when
 * the API grows.
 */

export interface GitLabUser {
  id?: number;
  username?: string;
  name?: string;
  email?: string;
  state?: string;
  web_url?: string;
  [key: string]: unknown;
}

export interface GitLabMergeRequest {
  id?: number;
  iid: number;
  title?: string;
  description?: string | null;
  state?: string;
  /** Modern field; older servers use `work_in_progress`. */
  draft?: boolean;
  work_in_progress?: boolean;
  author?: GitLabUser;
  assignees?: GitLabUser[];
  reviewers?: GitLabUser[];
  labels?: string[];
  source_branch?: string;
  target_branch?: string;
  /** GitLab 15.6+; older servers only provide `merge_status`. */
  detailed_merge_status?: string;
  merge_status?: string;
  created_at?: string;
  updated_at?: string;
  web_url?: string;
  [key: string]: unknown;
}

/** A note (comment). `system: true` marks an event like "added label", not a human comment. */
export interface GitLabNote {
  id: number;
  body?: string;
  author?: GitLabUser;
  created_at?: string;
  updated_at?: string;
  system?: boolean;
  [key: string]: unknown;
}

export interface GitLabCommit {
  id?: string;
  short_id?: string;
  title?: string;
  message?: string;
  author_name?: string;
  author_email?: string;
  /** `/commits` returns `created_at`; some payloads only carry `committed_date`. */
  created_at?: string;
  committed_date?: string;
  [key: string]: unknown;
}

/** One changed file. Returned by both `/diffs` and, nested, by `/changes`. */
export interface GitLabDiff {
  old_path?: string;
  new_path?: string;
  new_file?: boolean;
  renamed_file?: boolean;
  deleted_file?: boolean;
  diff?: string;
  [key: string]: unknown;
}

/**
 * The two diff endpoints disagree on shape: `/diffs` (GitLab 15.7+) returns a
 * bare array, `/changes` wraps it in `{ changes: [...] }`. The formatter accepts
 * either.
 */
export type GitLabDiffPayload = GitLabDiff[] | { changes?: GitLabDiff[]; [key: string]: unknown };

export interface GitLabApprovedBy {
  user?: GitLabUser;
  [key: string]: unknown;
}

export interface GitLabApprovals {
  approved?: boolean;
  approvals_required?: number;
  approvals_left?: number;
  approved_by?: GitLabApprovedBy[];
  [key: string]: unknown;
}

/**
 * A parsed merge-request reference.
 *
 * `projectPathEncoded` is the URL-encoded form used to address the project in
 * API paths (`group/project` -> `group%2Fproject`), which is why no numeric
 * project ID lookup is needed.
 */
export interface MrRef {
  host: string;
  projectPath: string;
  projectPathEncoded: string;
  iid: string;
}
