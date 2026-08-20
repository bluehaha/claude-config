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

import { apiRequest } from './client.ts';
import type {
  NotionBlock,
  NotionBlockChildrenResponse,
  NotionPage,
  PageTreeResult,
} from '../types.ts';

// Block types that reference another page/database. We render these as links
// rather than fetching their contents.
const NO_RECURSE_TYPES: ReadonlySet<string> = new Set(['child_page', 'child_database']);

/**
 * Retrieve a page object (title + properties, no block content).
 *
 * @param pageId - dashed UUID
 */
export async function getPage(pageId: string): Promise<NotionPage> {
  return apiRequest<NotionPage>(`/pages/${pageId}`);
}

/**
 * Retrieve all direct children of a block (or page), following pagination.
 *
 * @param blockId - dashed UUID of the parent block/page
 * @returns flat array of child block objects
 */
export async function getBlockChildren(blockId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined = undefined;

  do {
    const params = new URLSearchParams({ page_size: '100' });
    if (cursor) params.set('start_cursor', cursor);
    const response: NotionBlockChildrenResponse =
      await apiRequest<NotionBlockChildrenResponse>(
        `/blocks/${blockId}/children?${params.toString()}`,
      );
    if (Array.isArray(response.results)) {
      blocks.push(...response.results);
    }
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

/**
 * Recursively attach children to any block that has them, except child_page /
 * child_database blocks (left as leaves). Each block gets a `_children` array.
 */
async function attachChildren(blocks: NotionBlock[]): Promise<NotionBlock[]> {
  for (const block of blocks) {
    if (block.has_children && block.id && !NO_RECURSE_TYPES.has(block.type ?? '')) {
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
 *
 * @param pageId - dashed UUID
 */
export async function getPageTree(pageId: string): Promise<PageTreeResult> {
  const page = await getPage(pageId);
  const topLevel = await getBlockChildren(pageId);
  const blocks = await attachChildren(topLevel);
  return { page, blocks };
}
