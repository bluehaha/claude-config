/**
 * Notion Pages + Blocks API methods
 *
 * A Notion "page" is a page object (title + properties) plus a tree of block
 * children fetched separately. getPageTree() assembles both: it retrieves the
 * page object and recursively walks its block children.
 *
 * Recursion policy: nested blocks (toggles, columns, list items, callouts, etc.)
 * are expanded, but child_page and child_database blocks are NOT recursed into -
 * they are left as leaf blocks and rendered as links by the markdown layer.
 */

import { apiRequest } from './client.mjs';

// Block types that reference another page/database. We render these as links
// rather than fetching their contents.
const NO_RECURSE_TYPES = new Set(['child_page', 'child_database']);

/**
 * Retrieve a page object (title + properties, no block content).
 * @param {string} pageId - dashed UUID
 * @returns {Promise<object>}
 */
export async function getPage(pageId) {
  return apiRequest(`/pages/${pageId}`);
}

/**
 * Retrieve all direct children of a block (or page), following pagination.
 * @param {string} blockId - dashed UUID of the parent block/page
 * @returns {Promise<object[]>} - flat array of child block objects
 */
export async function getBlockChildren(blockId) {
  const blocks = [];
  let cursor = undefined;

  do {
    const params = new URLSearchParams({ page_size: '100' });
    if (cursor) params.set('start_cursor', cursor);
    const response = await apiRequest(`/blocks/${blockId}/children?${params.toString()}`);
    if (Array.isArray(response.results)) {
      blocks.push(...response.results);
    }
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return blocks;
}

/**
 * Recursively attach children to any block that has them, except child_page /
 * child_database blocks (left as leaves). Each block gets a `_children` array.
 * @param {object[]} blocks
 * @returns {Promise<object[]>}
 */
async function attachChildren(blocks) {
  for (const block of blocks) {
    if (block.has_children && !NO_RECURSE_TYPES.has(block.type)) {
      const children = await getBlockChildren(block.id);
      block._children = await attachChildren(children);
    } else {
      block._children = [];
    }
  }
  return blocks;
}

/**
 * Retrieve a page and its full block tree (nested blocks expanded; child pages
 * and child databases left as links).
 * @param {string} pageId - dashed UUID
 * @returns {Promise<{page: object, blocks: object[]}>}
 */
export async function getPageTree(pageId) {
  const page = await getPage(pageId);
  const topLevel = await getBlockChildren(pageId);
  const blocks = await attachChildren(topLevel);
  return { page, blocks };
}
