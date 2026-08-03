/**
 * ClickUp API v2 domain models.
 *
 * These describe the parts of the API responses this skill reads or forwards.
 * They are deliberately non-exhaustive: ClickUp adds fields over time, so every
 * object carries an index signature and all but the essential fields are
 * optional. That keeps the types useful for autocomplete without breaking when
 * the API grows.
 */

/** A JSON value as returned by the API. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ClickUpUser {
  id?: number;
  username?: string | null;
  email?: string;
  color?: string | null;
  initials?: string;
  profilePicture?: string | null;
  [key: string]: unknown;
}

export interface ClickUpStatus {
  id?: string;
  status: string;
  color?: string;
  type?: string;
  orderindex?: number;
  [key: string]: unknown;
}

export interface ClickUpPriority {
  id?: string;
  priority?: string;
  color?: string;
  orderindex?: string;
  [key: string]: unknown;
}

export interface ClickUpTag {
  name: string;
  tag_fg?: string;
  tag_bg?: string;
  creator?: number;
  [key: string]: unknown;
}

export interface ClickUpChecklistItem {
  id?: string;
  name: string;
  orderindex?: number;
  assignee?: ClickUpUser | null;
  group_assignee?: unknown;
  resolved?: boolean;
  parent?: string | null;
  date_created?: string;
  children?: ClickUpChecklistItem[];
  [key: string]: unknown;
}

export interface ClickUpChecklist {
  id?: string;
  task_id?: string;
  name: string;
  orderindex?: number;
  resolved?: number;
  unresolved?: number;
  items?: ClickUpChecklistItem[];
  [key: string]: unknown;
}

export interface ClickUpCustomFieldTypeConfig {
  [key: string]: unknown;
}

export interface ClickUpCustomField {
  id?: string;
  name: string;
  type?: string;
  type_config?: ClickUpCustomFieldTypeConfig;
  value?: unknown;
  required?: boolean;
  date_created?: string;
  hide_from_guests?: boolean;
  [key: string]: unknown;
}

/** Shallow `{ id, name }` reference used for list / folder / space / project. */
export interface ClickUpReference {
  id?: string;
  name?: string | null;
  hidden?: boolean;
  access?: boolean;
  [key: string]: unknown;
}

export interface ClickUpTask {
  id: string;
  custom_id?: string | null;
  name: string;
  text_content?: string | null;
  description?: string | null;
  /** Present because the skill requests include_markdown_description=true. */
  markdown_description?: string;
  status?: ClickUpStatus;
  orderindex?: string;
  date_created?: string;
  date_updated?: string;
  date_closed?: string | null;
  date_done?: string | null;
  archived?: boolean;
  creator?: ClickUpUser;
  assignees?: ClickUpUser[];
  watchers?: ClickUpUser[];
  checklists?: ClickUpChecklist[];
  tags?: ClickUpTag[];
  parent?: string | null;
  priority?: ClickUpPriority | null;
  due_date?: string | null;
  start_date?: string | null;
  time_estimate?: number | null;
  time_spent?: number | null;
  custom_fields?: ClickUpCustomField[];
  dependencies?: unknown[];
  linked_tasks?: unknown[];
  /** Present because the skill requests include_subtasks=true. */
  subtasks?: ClickUpTask[];
  team_id?: string;
  url?: string;
  permission_level?: string;
  list?: ClickUpReference;
  project?: ClickUpReference;
  folder?: ClickUpReference;
  space?: ClickUpReference;
  [key: string]: unknown;
}

/** One block of a comment's rich-text representation. */
export interface ClickUpCommentBlock {
  text?: string;
  attributes?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ClickUpComment {
  id: string;
  /** Cursor value for pagination - a stringified epoch-ms timestamp. */
  date: string;
  comment?: ClickUpCommentBlock[];
  comment_text?: string;
  user?: ClickUpUser;
  resolved?: boolean;
  assignee?: ClickUpUser | null;
  assigned_by?: ClickUpUser | null;
  group_assignee?: unknown;
  reactions?: unknown[];
  replies?: unknown[];
  reply_count?: number;
  [key: string]: unknown;
}

/** Response shape of GET /task/{task_id}/comment. */
export interface ClickUpCommentsResponse {
  comments?: ClickUpComment[];
  [key: string]: unknown;
}

/** A parsed task reference: the task id plus the team id, when the input carried one. */
export interface TaskRef {
  taskId: string;
  teamId: string | null;
}

/** The JSON object this skill prints on stdout. */
export interface TaskQueryResult {
  task: ClickUpTask;
  comments: ClickUpComment[];
}
