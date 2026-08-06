/**
 * GitLab Users API - just the authenticated user, used to sanity-check auth.
 */

import { createClient } from './client.ts';
import type { GitLabUser } from '../types.ts';

/** The user the configured token belongs to. */
export function getCurrentUser(host: string): Promise<GitLabUser> {
  return createClient(host).get<GitLabUser>('/user');
}
