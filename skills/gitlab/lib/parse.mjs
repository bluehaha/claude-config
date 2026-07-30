// Parse GitLab merge-request references into { host, projectPath, iid }.
//
// Accepts, in order of preference:
//   1. Full MR URL:   https://gitlab.example.com/group/sub/project/-/merge_requests/4230
//   2. Shorthand:     group/sub/project!4230
//   3. Bare iid:      4230            (requires GITLAB_DEFAULT_PROJECT)
//
// GitLab project paths can be nested (group/subgroup/project), so we take
// everything before the `/-/merge_requests/` marker as the path.

/**
 * @param {string} ref  URL, shorthand, or bare iid
 * @param {{ host?: string, defaultProject?: string }} env
 * @returns {{ host: string, projectPath: string, projectPathEncoded: string, iid: string }}
 */
export function parseMrRef(ref, env = {}) {
  if (!ref || typeof ref !== 'string') {
    throw new Error('Missing merge request reference (URL, path!iid, or iid).');
  }
  ref = ref.trim();

  // 1. Full URL
  if (/^https?:\/\//i.test(ref)) {
    let url;
    try {
      url = new URL(ref);
    } catch {
      throw new Error(`Not a valid URL: ${ref}`);
    }
    const m = url.pathname.match(/^\/(.+?)\/-\/merge_requests\/(\d+)/);
    if (!m) {
      throw new Error(
        `URL does not look like a merge request: ${ref}\n` +
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
  const bang = ref.match(/^(.+)!(\d+)$/);
  if (bang) {
    const projectPath = bang[1];
    return {
      host: requireHost(host),
      projectPath,
      projectPathEncoded: encodeURIComponent(projectPath),
      iid: bang[2],
    };
  }

  // 3. Bare iid  ->  needs a default project
  if (/^\d+$/.test(ref)) {
    const projectPath = env.defaultProject;
    if (!projectPath) {
      throw new Error(
        `Got a bare iid (${ref}) but no project. ` +
          `Pass a full URL, use "group/project!${ref}", or set GITLAB_DEFAULT_PROJECT in .env.`,
      );
    }
    return {
      host: requireHost(host),
      projectPath,
      projectPathEncoded: encodeURIComponent(projectPath),
      iid: ref,
    };
  }

  throw new Error(
    `Could not parse "${ref}". Use a full MR URL, "group/project!123", or a bare iid.`,
  );
}

/** Strip trailing slash; add https:// if scheme omitted. */
export function normalizeHost(host) {
  if (!host) return undefined;
  host = host.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(host)) host = `https://${host}`;
  return host;
}

function requireHost(host) {
  if (!host) {
    throw new Error(
      'No GitLab host. Set GITLAB_HOST in .env, or pass a full MR URL.',
    );
  }
  return host;
}
