/**
 * Parse GitLab merge-request references into { host, projectPath, iid }.
 *
 * Accepts, in order of preference:
 *   1. Full MR URL:   https://gitlab.example.com/group/sub/project/-/merge_requests/4230
 *   2. Shorthand:     group/sub/project!4230
 *   3. Bare iid:      4230            (requires GITLAB_DEFAULT_PROJECT)
 *
 * GitLab project paths can be nested (group/subgroup/project), so we take
 * everything before the `/-/merge_requests/` marker as the path.
 */

import type { MrRef } from '../types.ts';

export interface ParseEnv {
  host?: string | undefined;
  defaultProject?: string | undefined;
}

/**
 * @param ref - URL, shorthand, or bare iid
 */
export function parseMrRef(ref: string | null | undefined, env: ParseEnv = {}): MrRef {
  if (!ref || typeof ref !== 'string') {
    throw new Error('Missing merge request reference (URL, path!iid, or iid).');
  }
  const trimmed = ref.trim();

  // 1. Full URL
  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      throw new Error(`Not a valid URL: ${trimmed}`);
    }
    const m = url.pathname.match(/^\/(.+?)\/-\/merge_requests\/(\d+)/);
    if (!m?.[1] || !m[2]) {
      throw new Error(
        `URL does not look like a merge request: ${trimmed}\n` +
          `Expected .../<project-path>/-/merge_requests/<iid>`,
      );
    }
    const projectPath = decodeURIComponent(m[1]);
    return {
      host: `${url.protocol}//${url.host}`,
      projectPath,
      projectPathEncoded: encodeURIComponent(projectPath),
      iid: m[2],
    };
  }

  const host = normalizeHost(env.host);

  // 2. Shorthand  project/path!iid
  const bang = trimmed.match(/^(.+)!(\d+)$/);
  if (bang?.[1] && bang[2]) {
    const projectPath = bang[1];
    return {
      host: requireHost(host),
      projectPath,
      projectPathEncoded: encodeURIComponent(projectPath),
      iid: bang[2],
    };
  }

  // 3. Bare iid  ->  needs a default project
  if (/^\d+$/.test(trimmed)) {
    const projectPath = env.defaultProject;
    if (!projectPath) {
      throw new Error(
        `Got a bare iid (${trimmed}) but no project. ` +
          `Pass a full URL, use "group/project!${trimmed}", or set GITLAB_DEFAULT_PROJECT in .env.`,
      );
    }
    return {
      host: requireHost(host),
      projectPath,
      projectPathEncoded: encodeURIComponent(projectPath),
      iid: trimmed,
    };
  }

  throw new Error(
    `Could not parse "${trimmed}". Use a full MR URL, "group/project!123", or a bare iid.`,
  );
}

/** Strip trailing slash; add https:// if scheme omitted. */
export function normalizeHost(host: string | null | undefined): string | undefined {
  if (!host) return undefined;
  let normalized = host.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
  return normalized;
}

function requireHost(host: string | undefined): string {
  if (!host) {
    throw new Error('No GitLab host. Set GITLAB_HOST in .env, or pass a full MR URL.');
  }
  return host;
}

/** Resolve a reference using GITLAB_HOST / GITLAB_DEFAULT_PROJECT from the environment. */
export function refFrom(arg: string | null | undefined): MrRef {
  return parseMrRef(arg, {
    host: normalizeHost(process.env.GITLAB_HOST),
    defaultProject: process.env.GITLAB_DEFAULT_PROJECT,
  });
}
