/**
 * Notion API v1 domain models.
 *
 * These describe the parts of the API responses this skill reads or forwards.
 * They are deliberately non-exhaustive: Notion adds block types and property
 * types over time, so every object carries an index signature and all but the
 * essential fields are optional. That keeps the types useful for autocomplete
 * without breaking when the API grows.
 */

/** A JSON value as returned by the API. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Character-level formatting flags on a rich text run. */
export interface NotionAnnotations {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: string;
  [key: string]: unknown;
}

/**
 * One run of rich text.
 *
 * A link can arrive in either of two places - top-level `href`, or nested under
 * `text.link.url` - so the renderer checks both.
 */
export interface NotionRichText {
  type?: string;
  plain_text?: string;
  annotations?: NotionAnnotations;
  href?: string | null;
  text?: {
    content?: string;
    link?: { url?: string } | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** An emoji or file icon on a callout or page. */
export interface NotionIcon {
  type?: string;
  emoji?: string;
  [key: string]: unknown;
}

/** An uploaded or externally-hosted file reference. */
export interface NotionFile {
  url?: string;
  expiry_time?: string;
  [key: string]: unknown;
}

/**
 * The per-type payload of a block.
 *
 * Every block stores its data under a key equal to its own `type` - a paragraph
 * has `block.paragraph`, a callout has `block.callout`. The fields collected
 * here are the union of what the renderer reads across all handled types; which
 * ones are actually present depends on the block's type, so all are optional.
 */
export interface NotionBlockData {
  rich_text?: NotionRichText[];
  caption?: NotionRichText[];
  /** `to_do` completion state. */
  checked?: boolean;
  /** `code` block language, e.g. "javascript" or "plain text". */
  language?: string;
  /** `equation` LaTeX source. */
  expression?: string;
  /** `child_page` / `child_database` display title. */
  title?: string;
  /** `callout` icon. */
  icon?: NotionIcon | null;
  /** Discriminates `file` (Notion-hosted) from `external` for media blocks. */
  type?: string;
  file?: NotionFile;
  external?: NotionFile;
  /** `bookmark` / `embed` / `link_preview` target. */
  url?: string;
  /** `table` layout flags. */
  has_column_header?: boolean;
  has_row_header?: boolean;
  /** `table_row` cells - one rich text array per column. */
  cells?: NotionRichText[][];
  [key: string]: unknown;
}

/**
 * A block object.
 *
 * `_children` is NOT part of the API response - it is attached by
 * `api/pages.ts` while assembling the tree, and is always present (an empty
 * array for leaves) once `getPageTree` has run.
 *
 * The index signature is what makes the `block[type]` lookup in the renderer
 * type-check: the payload key varies with `type`.
 */
export interface NotionBlock {
  object?: string;
  id?: string;
  type?: string;
  has_children?: boolean;
  archived?: boolean;
  created_time?: string;
  last_edited_time?: string;
  /** Synthetic: populated by attachChildren() during tree assembly. */
  _children?: NotionBlock[];
  [key: string]: NotionBlockData | unknown;
}

/** A `select` / `status` option, or one entry of a `multi_select`. */
export interface NotionSelectOption {
  id?: string;
  name?: string;
  color?: string;
  [key: string]: unknown;
}

/** A user reference as it appears in a `people` property. */
export interface NotionUser {
  object?: string;
  id?: string;
  name?: string | null;
  avatar_url?: string | null;
  [key: string]: unknown;
}

/** A `date` property value; `end` is set only for ranges. */
export interface NotionDateValue {
  start?: string;
  end?: string | null;
  time_zone?: string | null;
  [key: string]: unknown;
}

/**
 * One entry of a page's `properties` map.
 *
 * `type` names which of the value fields below is populated. Only the variants
 * the header formatter renders are enumerated; anything else falls through to
 * the formatter's default branch.
 */
export interface NotionPropertyValue {
  id?: string;
  type?: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  number?: number | null;
  select?: NotionSelectOption | null;
  status?: NotionSelectOption | null;
  multi_select?: NotionSelectOption[];
  people?: NotionUser[];
  date?: NotionDateValue | null;
  checkbox?: boolean;
  url?: string | null;
  email?: string | null;
  phone_number?: string | null;
  created_time?: string;
  last_edited_time?: string;
  [key: string]: unknown;
}

/** A page object - title and properties, without block content. */
export interface NotionPage {
  object?: string;
  id?: string;
  url?: string;
  created_time?: string;
  last_edited_time?: string;
  archived?: boolean;
  icon?: NotionIcon | null;
  parent?: Record<string, unknown>;
  properties?: Record<string, NotionPropertyValue>;
  [key: string]: unknown;
}

/** Response shape of GET /blocks/{block_id}/children. */
export interface NotionBlockChildrenResponse {
  object?: string;
  results?: NotionBlock[];
  has_more?: boolean;
  next_cursor?: string | null;
  [key: string]: unknown;
}

/** A page plus its assembled block tree - the `get` command's payload. */
export interface PageTreeResult {
  page: NotionPage;
  blocks: NotionBlock[];
}
