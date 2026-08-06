/**
 * GitLab Merge Requests API methods.
 *
 * Every endpoint hangs off the same base path, built from the URL-encoded
 * project path plus the MR iid - so no numeric project ID lookup is needed.
 */

import { createClient, GitLabError } from './client.ts';
import type {
  GitLabApprovals,
  GitLabCommit,
  GitLabDiffPayload,
  GitLabMergeRequest,
  MrRef,
} from '../types.ts';

/** `/projects/{encoded path}/merge_requests/{iid}` - the base every call extends. */
export function mrBase(ref: MrRef): string {
  return `/projects/${ref.projectPathEncoded}/merge_requests/${ref.iid}`;
}

export function getMergeRequest(ref: MrRef): Promise<GitLabMergeRequest> {
  return createClient(ref.host).get<GitLabMergeRequest>(mrBase(ref));
}

export function getCommits(ref: MrRef): Promise<GitLabCommit[]> {
  return createClient(ref.host).get<GitLabCommit[]>(`${mrBase(ref)}/commits`, {
    per_page: 100,
  });
}

export function getApprovals(ref: MrRef): Promise<GitLabApprovals> {
  return createClient(ref.host).get<GitLabApprovals>(`${mrBase(ref)}/approvals`);
}

/**
 * Retrieve the MR's changed files.
 *
 * `/diffs` exists from GitLab 15.7 and paginates; older servers only have
 * `/changes`, which wraps the same objects in `{ changes: [...] }`. We try the
 * modern endpoint first and fall back on a 404.
 */
export async function getDiffs(ref: MrRef): Promise<GitLabDiffPayload> {
  const client = createClient(ref.host);
  try {
    return await client.get<GitLabDiffPayload>(`${mrBase(ref)}/diffs`, { per_page: 100 });
  } catch (err) {
    if (err instanceof GitLabError && err.status === 404) {
      return client.get<GitLabDiffPayload>(`${mrBase(ref)}/changes`);
    }
    throw err;
  }
}
