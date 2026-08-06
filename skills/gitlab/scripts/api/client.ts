/**
 * GitLab API client - core HTTP layer and environment handling.
 *
 * Thin wrapper over the GitLab REST API v4 using Node's built-in fetch. Auth is
 * the personal access token in the PRIVATE-TOKEN header.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/api -> scripts, where .env sits next to .env-example.
export const ENV_PATH: string = resolve(__dirname, '..', '.env');

/** Load .env from the scripts directory. Returns false if it is missing or unreadable. */
export function loadEnv(): boolean {
  if (!existsSync(ENV_PATH)) {
    return false;
  }

  try {
    const envContent = readFileSync(ENV_PATH, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // A real environment variable wins over .env - including one set to an
      // empty string, hence `in` rather than a truthiness check.
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export class GitLabError extends Error {
  status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GitLabError';
    this.status = status;
  }
}

export interface GitLabClientOptions {
  host: string | undefined;
  token: string | undefined;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | undefined | null> | undefined;
  body?: unknown;
}

export class GitLabClient {
  host: string;
  token: string;

  constructor({ host, token }: GitLabClientOptions) {
    if (!host) throw new GitLabError('No GitLab host configured.');
    if (!token) {
      throw new GitLabError(
        'No GITLAB_TOKEN set. Add it to .claude/skills/gitlab/scripts/.env ' +
          '(User Settings > Access Tokens, scope "api").',
      );
    }
    this.host = host.replace(/\/+$/, '');
    this.token = token;
  }

  /**
   * @param path - API path after /api/v4, e.g. "/projects/1/merge_requests/2"
   * @typeParam T - the expected shape of the decoded JSON response.
   */
  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const { method = 'GET', query, body } = opts;
    const url = new URL(`${this.host}/api/v4${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { 'PRIVATE-TOKEN': this.token };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      // Assigned conditionally rather than passed as `body: undefined`, which
      // exactOptionalPropertyTypes rejects against RequestInit.
      init.body = JSON.stringify(body);
    }

    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new GitLabError(`Network error reaching ${this.host}: ${message}`);
    }

    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text; // non-JSON (rare); surface as-is
    }

    if (!res.ok) {
      throw new GitLabError(explain(res.status, data), res.status);
    }
    return data as T;
  }

  get<T>(path: string, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>(path, { method: 'GET', query });
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body });
  }
}

/** Build a client from the loaded environment. */
export function createClient(host: string | undefined): GitLabClient {
  return new GitLabClient({ host, token: process.env.GITLAB_TOKEN });
}

/** Turn an HTTP status into a message that names the likely cause. */
function explain(status: number, data: unknown): string {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  const detail =
    (record && (record.message ?? record.error ?? record.error_description)) ||
    (typeof data === 'string' ? data : '') ||
    '';
  const detailStr = typeof detail === 'object' ? JSON.stringify(detail) : String(detail);

  switch (status) {
    case 401:
      return `401 Unauthorized — token missing, expired, or wrong. Check GITLAB_TOKEN in .env. ${detailStr}`;
    case 403:
      return `403 Forbidden — token lacks scope/permission for this project (need "api" or "read_api"). ${detailStr}`;
    case 404:
      return `404 Not Found — wrong project path, MR iid, or host. ${detailStr}`;
    default:
      return `HTTP ${status}${detailStr ? ` — ${detailStr}` : ''}`;
  }
}
