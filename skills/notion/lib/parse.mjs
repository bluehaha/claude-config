/**
 * URL and ID parsing utilities for Notion
 */

// Insert dashes into a bare 32-char hex ID to form the dashed UUID the API expects.
// 8-4-4-4-12
function toDashedUuid(hex) {
  return (
    hex.slice(0, 8) + '-' +
    hex.slice(8, 12) + '-' +
    hex.slice(12, 16) + '-' +
    hex.slice(16, 20) + '-' +
    hex.slice(20, 32)
  );
}

// Extract a Notion page ID from a URL, slug, dashed UUID, or bare hex string,
// and normalize it to the dashed UUID form the API accepts.
//
// Handles:
//   ffbdd143bae2428eb3d1bc5e4b3860e4                        (bare hex)
//   ffbdd143-bae2-428e-b3d1-bc5e4b3860e4                    (dashed UUID)
//   https://www.notion.so/Page-Title-ffbdd143...860e4       (slug + id)
//   https://app.notion.com/p/universetech/ffbdd143...860e4  (workspace + id)
//   https://www.notion.so/...?p=ffbdd143...860e4            (peek param)
export function parsePageId(input) {
  if (!input) return null;

  // Already a dashed UUID
  const dashed = input.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
  if (dashed) {
    return dashed[1].toLowerCase();
  }

  // Any 32-char hex run (bare id, or the trailing segment of a slug URL / query param).
  // Use the LAST match so a slug like "Notes-abc...-def..." resolves to the id, not
  // an incidental hex run earlier in the title.
  const hexMatches = input.match(/[0-9a-fA-F]{32}/g);
  if (hexMatches && hexMatches.length > 0) {
    return toDashedUuid(hexMatches[hexMatches.length - 1].toLowerCase());
  }

  return null;
}
