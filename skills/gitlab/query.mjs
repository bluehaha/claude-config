#!/usr/bin/env node
// GitLab merge-request CLI. See SKILL.md for usage.
//
//   node query.mjs <command> <url|id> [args] [--json]

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parseMrRef, normalizeHost } from './lib/parse.mjs';
import { GitLabClient, GitLabError } from './lib/client.mjs';
import {
  formatMr,
  formatNotes,
  formatCommits,
  formatDiffs,
  formatApprovals,
  formatUser,
} from './lib/format.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---- .env loading (no dependency) --------------------------------------
function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = readFileSync(join(HERE, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) env[key] = val; // real env wins over .env
    }
  } catch {
    /* no .env file — rely on process.env */
  }
  return env;
}

// ---- arg parsing --------------------------------------------------------
const argv = process.argv.slice(2);
const flags = { json: false };
const positional = [];
for (const a of argv) {
  if (a === '--json') flags.json = true;
  else positional.push(a);
}
const [command, ...rest] = positional;

const env = loadEnv();

function client(host) {
  return new GitLabClient({ host, token: env.GITLAB_TOKEN });
}

function out(data, formatted) {
  if (flags.json) console.log(JSON.stringify(data, null, 2));
  else console.log(formatted);
}

function refFrom(arg) {
  return parseMrRef(arg, {
    host: normalizeHost(env.GITLAB_HOST),
    defaultProject: env.GITLAB_DEFAULT_PROJECT,
  });
}

const mrBase = (p) => `/projects/${p.projectPathEncoded}/merge_requests/${p.iid}`;

// ---- commands -----------------------------------------------------------
const commands = {
  async me() {
    const host = normalizeHost(env.GITLAB_HOST);
    if (!host) throw new GitLabError('Set GITLAB_HOST in .env to use `me`.');
    const u = await client(host).get('/user');
    out(u, formatUser(u));
  },

  async get(arg) {
    const p = refFrom(arg);
    const mr = await client(p.host).get(mrBase(p));
    out(mr, formatMr(mr));
  },

  async comments(arg) {
    const p = refFrom(arg);
    const notes = await client(p.host).get(`${mrBase(p)}/notes`, {
      sort: 'asc',
      order_by: 'created_at',
      per_page: 100,
    });
    out(notes, formatNotes(notes));
  },

  async diff(arg) {
    const p = refFrom(arg);
    const c = client(p.host);
    let data;
    try {
      data = await c.get(`${mrBase(p)}/diffs`, { per_page: 100 }); // GitLab 15.7+
    } catch (e) {
      if (e.status === 404) data = await c.get(`${mrBase(p)}/changes`); // older servers
      else throw e;
    }
    out(data, formatDiffs(data));
  },

  async 'commit-list'(arg) {
    const p = refFrom(arg);
    const commits = await client(p.host).get(`${mrBase(p)}/commits`, { per_page: 100 });
    out(commits, formatCommits(commits));
  },

  async approvals(arg) {
    const p = refFrom(arg);
    const a = await client(p.host).get(`${mrBase(p)}/approvals`);
    out(a, formatApprovals(a));
  },

  async comment(arg, ...msgParts) {
    const p = refFrom(arg);
    const body = msgParts.join(' ');
    if (!body.trim()) throw new GitLabError('Empty comment. Provide a message.');
    const note = await client(p.host).post(`${mrBase(p)}/notes`, { body });
    out(note, `Posted comment (note ${note.id}) on !${p.iid}.`);
  },
};

const HELP = `GitLab MR CLI

  node query.mjs <command> <url|id> [args] [--json]

Commands:
  get <url|id>              MR details (title, state, author, branches, description)
  diff <url|id>             Changed files and diffs
  comments <url|id>         List comments (notes), system events hidden
  commit-list <url|id>      Commits in the MR
  approvals <url|id>        Approval status
  comment <url|id> "msg"    Post a comment on the MR
  me                        Show the token's user (sanity-check auth)

Reference formats:
  Full URL   https://gitlab.example.com/group/project/-/merge_requests/4230
  Shorthand  group/project!4230
  Bare iid   4230           (needs GITLAB_DEFAULT_PROJECT in .env)

Flags:
  --json     Raw JSON output`;

// ---- dispatch -----------------------------------------------------------
async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP);
    process.exit(command ? 0 : 1);
  }
  const fn = commands[command];
  if (!fn) {
    console.error(`Unknown command: ${command}\n\n${HELP}`);
    process.exit(1);
  }
  try {
    await fn(...rest);
  } catch (err) {
    if (err instanceof GitLabError) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

main();
