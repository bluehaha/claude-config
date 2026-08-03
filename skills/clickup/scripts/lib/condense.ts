/**
 * Condense a raw ClickUp API response down to the fields worth reading.
 *
 * The API returns ~96KB for a typical task, of which ~94% is metadata: full
 * task objects for every subtask, dropdown option lists for custom fields that
 * have no value, and seven near-identical signed URLs per attachment. This
 * module keeps the content and drops the scaffolding.
 *
 * Custom field values need care rather than deletion: `labels` and `drop_down`
 * fields store an option id or index, and the human-readable text lives in
 * `type_config.options`. Those are resolved here, so the caller sees
 * `類型: ["GA"]` instead of `["009bf52c-..."]`.
 */

import type {
  ClickUpAttachment,
  ClickUpChecklist,
  ClickUpChecklistItem,
  ClickUpComment,
  ClickUpCustomField,
  ClickUpCustomFieldOption,
  ClickUpTask,
  ClickUpUser,
  CondensedAttachment,
  CondensedChecklist,
  CondensedChecklistItem,
  CondensedComment,
  CondensedSubtask,
  CondensedTask,
  CondensedTaskQueryResult,
  TaskQueryResult,
} from '../types.ts';

/** Drop keys whose value is null, undefined, `[]`, or `{}`. */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value as object).length === 0
    ) {
      continue;
    }
    out[key] = value;
  }
  return out as Partial<T>;
}

/** A user reduced to the name you'd actually mention. */
function userName(user: ClickUpUser | null | undefined): string | null {
  if (!user) return null;
  return user.username || user.email || (user.id != null ? String(user.id) : null);
}

function userNames(users: ClickUpUser[] | null | undefined): string[] {
  if (!users) return [];
  return users.map(userName).filter((name): name is string => Boolean(name));
}

/**
 * ClickUp timestamps are stringified epoch-ms. Render them as ISO-8601 so dates
 * are readable without a conversion step; leave anything unparseable alone.
 */
function isoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const ms = Number(value);
  if (!Number.isFinite(ms)) return typeof value === 'string' ? value : null;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Resolve a custom field's stored value to human-readable text.
 *
 * The two option-backed types disagree on both the lookup key and the label
 * key, so they are handled separately:
 *   - `labels`    - value is an array of option **ids**;   text is `option.label`
 *   - `drop_down` - value is an option **orderindex**;     text is `option.name`
 * Every other type is passed through as-is.
 */
function resolveCustomFieldValue(field: ClickUpCustomField): unknown {
  const { type, value } = field;
  const options: ClickUpCustomFieldOption[] = field.type_config?.options ?? [];

  if (type === 'labels' && Array.isArray(value)) {
    return value.map((id) => {
      const option = options.find((opt) => opt.id === id);
      return option?.label ?? option?.name ?? id;
    });
  }

  if (type === 'drop_down' && (typeof value === 'number' || typeof value === 'string')) {
    const option =
      options.find((opt) => opt.orderindex === value) ?? options.find((opt) => opt.id === value);
    return option?.name ?? option?.label ?? value;
  }

  if (type === 'users' && Array.isArray(value)) {
    return userNames(value as ClickUpUser[]);
  }

  if (type === 'date') {
    return isoDate(value) ?? value;
  }

  return value;
}

/**
 * Custom fields as a flat `name -> value` map, omitting fields the task never
 * set. Unset fields are the majority and carry no information about the task.
 */
function condenseCustomFields(
  fields: ClickUpCustomField[] | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!fields) return out;

  for (const field of fields) {
    if (!('value' in field) || field.value === null || field.value === undefined) continue;
    if (Array.isArray(field.value) && field.value.length === 0) continue;

    const resolved = resolveCustomFieldValue(field);
    if (resolved === null || resolved === undefined) continue;
    out[field.name] = resolved;
  }

  return out;
}

function condenseChecklistItem(item: ClickUpChecklistItem): CondensedChecklistItem {
  return compact({
    name: item.name,
    resolved: item.resolved ?? false,
    assignee: userName(item.assignee),
    children: (item.children ?? []).map(condenseChecklistItem),
  }) as CondensedChecklistItem;
}

function condenseChecklist(checklist: ClickUpChecklist): CondensedChecklist {
  return compact({
    name: checklist.name,
    resolved: checklist.resolved,
    unresolved: checklist.unresolved,
    items: (checklist.items ?? []).map(condenseChecklistItem),
  }) as CondensedChecklist;
}

/**
 * A subtask is returned by the API as a complete task object. Only its identity
 * and progress matter in the parent's context - fetch the subtask directly when
 * its description or comments are needed.
 */
function condenseSubtask(subtask: ClickUpTask): CondensedSubtask {
  return compact({
    id: subtask.id,
    name: subtask.name,
    status: subtask.status?.status ?? null,
    assignees: userNames(subtask.assignees),
    priority: subtask.priority?.priority ?? null,
    due_date: isoDate(subtask.due_date),
  }) as CondensedSubtask;
}

/** Attachments carry 7 URL variants apiece; one plus the title is enough. */
function condenseAttachment(attachment: ClickUpAttachment): CondensedAttachment {
  return compact({
    title: attachment.title ?? attachment.name ?? null,
    url: attachment.url ?? null,
    size: attachment.size ?? null,
    date: isoDate(attachment.date),
  }) as CondensedAttachment;
}

/**
 * Comments store their text twice - as a rich-text block array and as flat
 * `comment_text`. Keep the flat one.
 */
function condenseComment(comment: ClickUpComment): CondensedComment {
  return compact({
    id: comment.id,
    user: userName(comment.user),
    date: isoDate(comment.date),
    text: comment.comment_text ?? (comment.comment ?? []).map((b) => b.text ?? '').join(''),
    resolved: comment.resolved || null,
    assignee: userName(comment.assignee),
    reply_count: comment.reply_count || null,
  }) as CondensedComment;
}

/**
 * `description`, `text_content` and `markdown_description` hold the same prose
 * in three encodings. Prefer markdown, which is what the skill asks the API for.
 */
function pickDescription(task: ClickUpTask): string | null {
  return task.markdown_description || task.description || task.text_content || null;
}

export function condenseTask(task: ClickUpTask): CondensedTask {
  return compact({
    id: task.id,
    custom_id: task.custom_id,
    name: task.name,
    url: task.url,
    status: task.status?.status ?? null,
    priority: task.priority?.priority ?? null,
    description: pickDescription(task),
    assignees: userNames(task.assignees),
    creator: userName(task.creator),
    tags: (task.tags ?? []).map((tag) => tag.name),
    parent: task.parent,
    list: task.list?.name ?? null,
    folder: task.folder?.name ?? null,
    space: task.space?.name ?? null,
    date_created: isoDate(task.date_created),
    date_updated: isoDate(task.date_updated),
    due_date: isoDate(task.due_date),
    start_date: isoDate(task.start_date),
    time_estimate: task.time_estimate,
    custom_fields: condenseCustomFields(task.custom_fields),
    checklists: (task.checklists ?? []).map(condenseChecklist),
    subtasks: (task.subtasks ?? []).map(condenseSubtask),
    attachments: (task.attachments ?? []).map(condenseAttachment),
    linked_tasks: task.linked_tasks,
    dependencies: task.dependencies,
  }) as CondensedTask;
}

export function condenseResult(result: TaskQueryResult): CondensedTaskQueryResult {
  return {
    task: condenseTask(result.task),
    comments: result.comments.map(condenseComment),
  };
}
