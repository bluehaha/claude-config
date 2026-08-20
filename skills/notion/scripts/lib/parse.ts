/**
 * URL and ID parsing utilities for Notion.
 *
 * Notion page references come in a few shapes:
 *   ffbdd143bae2428eb3d1bc5e4b3860e4                        bare 32-char hex
 *   ffbdd143-bae2-428e-b3d1-bc5e4b3860e4                    dashed UUID
 *   https://www.notion.so/Page-Title-ffbdd143...860e4       slug + id
 *   https://app.notion.com/p/universetech/ffbdd143...860e4  workspace + id
 *   https://www.notion.so/...?p=ffbdd143...860e4            peek param
 *
 * parsePageId normalizes all of them to the dashed UUID form the API accepts.
 */

// A dashed UUID, in the 8-4-4-4-12 grouping Notion uses.
const DASHED_UUID_RE =
  /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/;
const HEX32_RE = /[0-9a-fA-F]{32}/g;

/** Insert dashes into a bare 32-char hex ID to form the dashed UUID the API expects. */
function toDashedUuid(hex: string): string {
  return (
    hex.slice(0, 8) + '-' +
    hex.slice(8, 12) + '-' +
    hex.slice(12, 16) + '-' +
    hex.slice(16, 20) + '-' +
    hex.slice(20, 32)
  );
}

/**
 * @param input - a page URL, a dashed UUID, or a bare 32-char hex id
 * @returns the dashed UUID, or null when nothing page-shaped was found
 */
export function parsePageId(input: string | null | undefined): string | null {
  if (!input) return null;

  // Already a dashed UUID.
  const dashed = input.match(DASHED_UUID_RE);
  if (dashed?.[1]) {
    return dashed[1].toLowerCase();
  }

  // Any 32-char hex run (bare id, or the trailing segment of a slug URL / query
  // param). Use the LAST match so a slug like "Notes-abc...-def..." resolves to
  // the id, not an incidental hex run earlier in the title.
  const hexMatches = input.match(HEX32_RE);
  const last = hexMatches?.[hexMatches.length - 1];
  if (last) {
    return toDashedUuid(last.toLowerCase());
  }

  return null;
}
