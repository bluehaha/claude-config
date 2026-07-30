// Thin wrapper over the GitLab REST API v4 using Node's built-in fetch.
// Auth is via the PRIVATE-TOKEN header (personal access token).

export class GitLabError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'GitLabError';
    this.status = status;
  }
}

export class GitLabClient {
  /**
   * @param {{ host: string, token: string }} opts
   */
  constructor({ host, token }) {
    if (!host) throw new GitLabError('No GitLab host configured.');
    if (!token) {
      throw new GitLabError(
        'No GITLAB_TOKEN set. Add it to .claude/skills/gitlab/.env ' +
          '(User Settings > Access Tokens, scope "api").',
      );
    }
    this.host = host.replace(/\/+$/, '');
    this.token = token;
  }

  /**
   * @param {string} path  API path after /api/v4, e.g. "/projects/1/merge_requests/2"
   * @param {{ method?: string, query?: Record<string,string|number>, body?: any }} opts
   */
  async request(path, opts = {}) {
    const { method = 'GET', query, body } = opts;
    const url = new URL(`${this.host}/api/v4${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const headers = { 'PRIVATE-TOKEN': this.token };
    let payload;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(url, { method, headers, body: payload });
    } catch (err) {
      throw new GitLabError(`Network error reaching ${this.host}: ${err.message}`);
    }

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text; // non-JSON (rare); surface as-is
    }

    if (!res.ok) {
      throw new GitLabError(explain(res.status, data), res.status);
    }
    return data;
  }

  get(path, query) {
    return this.request(path, { method: 'GET', query });
  }

  post(path, body) {
    return this.request(path, { method: 'POST', body });
  }
}

function explain(status, data) {
  const detail =
    (data && (data.message || data.error || data.error_description)) ||
    (typeof data === 'string' ? data : '') ||
    '';
  const detailStr =
    typeof detail === 'object' ? JSON.stringify(detail) : String(detail);

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
