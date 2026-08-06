/**
 * Shared stdout helper for every command.
 *
 * Commands render human-readable text by default; `--json` prints the raw API
 * response instead, for scripting and piping to jq.
 */

export interface OutputOptions {
  /** Print the raw API response as JSON instead of formatted text. */
  json?: boolean;
}

export function out(data: unknown, formatted: string, options: OutputOptions = {}): void {
  if (options.json) console.log(JSON.stringify(data, null, 2));
  else console.log(formatted);
}
