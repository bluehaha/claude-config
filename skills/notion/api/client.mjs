/**
 * Notion API client - core HTTP layer and environment handling
 */

import { readFileSync, existsSync, appendFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ENV_PATH = resolve(__dirname, '..', '.env');
export const API_BASE = 'https://api.notion.com/v1';

// Notion requires a version header on every request.
// See https://developers.notion.com/reference/versioning
export const NOTION_VERSION = '2022-06-28';

// Load .env from skill directory
export function loadEnv() {
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
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1);
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Append a value to .env file
export function appendToEnv(key, value, comment = null) {
  try {
    let content = '\n';
    if (comment) {
      content += `# ${comment}\n`;
    }
    content += `${key}=${value}\n`;
    appendFileSync(ENV_PATH, content);
    process.env[key] = value;
    return true;
  } catch (e) {
    return false;
  }
}

function requireToken() {
  const token = process.env.NOTION_API_TOKEN;
  if (!token) {
    console.error('Error: NOTION_API_TOKEN not configured');
    console.error('');
    console.error('Setup:');
    console.error('  1. Copy .env-example to .env in the skill directory');
    console.error('  2. Create an internal integration at https://www.notion.so/my-integrations');
    console.error('  3. Copy its Internal Integration Secret into NOTION_API_TOKEN');
    console.error('  4. Share the target page with the integration (page ... > Connections)');
    process.exit(1);
  }
  return token;
}

// Make an API request against the Notion v1 API.
export async function apiRequest(endpoint, options = {}) {
  const token = requireToken();

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    // Notion returns 404 both for genuinely missing objects and for objects
    // the integration hasn't been granted access to - the sharing step is the
    // most common cause, so surface it.
    if (response.status === 404) {
      throw new Error(
        `Notion API error: 404 - ${text}\n` +
        'Hint: make sure the page is shared with your integration ' +
        '(open the page in Notion > ... menu > Connections > add your integration).'
      );
    }
    throw new Error(`Notion API error: ${response.status} - ${text}`);
  }

  const text = await response.text();
  if (!text) {
    return {};
  }
  return JSON.parse(text);
}
