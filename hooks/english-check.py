#!/usr/bin/env python3
"""Background English grammar check hook for Claude Code.

Triggered by UserPromptSubmit. Reads the hook payload from stdin, decides
whether the prompt is worth checking, then spawns a background `claude -p`
call. Result is written to:

  /tmp/claude-english-check/trigger.log    (every invocation: time, decision, prompt)
  /tmp/claude-english-check/check.log      (full diagnostics, append-only)
  /tmp/claude-english-check/status         (single-line summary for statusline)

The hook itself returns immediately with exit 0 — it never blocks the prompt
and never injects anything into Claude's context.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

DATA_DIR = Path("/tmp/ai-english-check")
LOG_FILE = DATA_DIR / "check.log"
STATUS_FILE = DATA_DIR / "status"
TRIGGER_LOG = DATA_DIR / "trigger.log"
WORD_THRESHOLD = 5
TIMEOUT_SECS = 60
MODEL = "opus"

SYSTEM_PROMPT = """
你是英文家教要批改我的英文。

任務：
- 批改英文，指出問題並修正，如果有更好的說法，也請提供，比如說更正式的版本、更簡潔的版本或進階版本，適時補充即可，不需要每句都提供
  - 會回傳在 `fixed` 欄位，會有版本標題、完整句子，且在修改的部分會用 `**` 包起來
  - ex:
    - 推薦改法 (正式): Updated the file paths and naming conventions.
    - 推薦改法 (簡潔/指令): Update file paths and naming rules.
- 適時補充相關的英文知識，幫助我理解
- 若出現中文，表示使用者不知道怎麼翻譯成英文，請幫他翻譯並修正整句英文
- 若無問題，輸出單行：OK
- 若有問題，輸出 JSON：{"issues": <整數>, "fixed": ["<修正後英文1>", "<修正後英文2>"], "reasons": ["原因1（繁中）", "原因2"], "supplements": ["補充1(繁中)", "補充2"], "translation": "<該英文的中文翻譯>"}
  - supplements 適時補充相關的英文知識，例如為什麼這樣說、類似的例子、常見的錯誤等等，幫助使用者理解
  - translation 原本句子的中文翻譯，確保雙方的理解一致
  - Example:
    ```
    Input:  update file path and filename rule .
    Output: {
        "issues": 2,
        "fixed": ["推薦改法 (正式): Updated the file paths and naming conventions.", "推薦改法 (簡潔/指令): Update file paths and naming rules."],
        "reasons": ["動詞 'have' 的第三人稱單數現在式是 'has'，但主詞 'I' 不適用", "冠詞 'a' 在母音開頭的單字前應該用 'an'"],
        "supplements": ["英文中，動詞需要和主詞的人稱和數一致。", "使用 'a' 或 'an' 取決於後面單字的發音，而不是拼寫。"],
        "translation": "我有一個蘋果。"
    }
    ```
- 不要 markdown、不要解釋、不要 code fence、不要其他內容
- 直接輸出 OK 或 JSON，第一個字元必須是 `O` 或 `{`，禁止任何開場白（例如「I'll help you...」）或結尾文字
"""


def extract_json(text: str) -> str:
    """Pull the {...} object out of model output.

    The model sometimes wraps the JSON in a conversational preamble
    ("I'll help you...") despite --bare. Grab from the first '{' to the
    last '}' — greedy so trailing prose is dropped too.
    """
    match = re.search(r"\{.*\}", text, re.S)
    return match.group(0) if match else text


def strip_noise(prompt: str) -> str:
    """Strip code, URLs, and paths so counting focuses on natural language."""
    text = re.sub(r"```.*?```", " ", prompt, flags=re.S)
    text = re.sub(r"`[^`]*`", " ", text)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"\S*[/.]\S*", " ", text)
    return text


def english_word_count(prompt: str) -> int:
    text = strip_noise(prompt)
    text = re.sub(r"[一-鿿　-〿＀-￯]", " ", text)
    return len(re.findall(r"[A-Za-z][A-Za-z']*", text))


def chinese_char_count(prompt: str) -> int:
    text = strip_noise(prompt)
    return len(re.findall(r"[一-鿿]", text))


DIFF_MARKERS = ("diff --git ", "@@ ", "+++ ", "--- ", "index ")


def looks_like_diff_or_code(prompt: str) -> bool:
    """Heuristics for Claude Code's internal commit/PR/diff prompts."""
    if any(m in prompt for m in DIFF_MARKERS):
        return True
    lines = prompt.splitlines()
    if len(lines) >= 10:
        plus_minus = sum(1 for l in lines if l[:1] in ("+", "-"))
        if plus_minus >= 5:
            return True
    return False


def should_skip(prompt: str) -> bool:
    if prompt.lstrip().startswith("/"):
        return True
    if looks_like_diff_or_code(prompt):
        return True
    english = english_word_count(prompt)
    if english <= WORD_THRESHOLD:
        return True
    return chinese_char_count(prompt) > english


def append_trigger_log(prompt: str, decision: str) -> None:
    """Record every hook invocation: when it fired, what it saw, what we did."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    one_line = prompt.replace("\n", "\\n")
    with TRIGGER_LOG.open("a") as f:
        f.write(f"[{ts}] {decision}\t{one_line}\n")


def write_status(text: str) -> None:
    STATUS_FILE.write_text(text)


def append_log(lines: list[str]) -> None:
    sep = "─" * 41
    block = [sep, *lines, sep, ""]
    with LOG_FILE.open("a") as f:
        f.write("\n".join(block))


def run_check(prompt: str, session_id: str) -> None:
    """Call `claude -p --bare` and translate the result into status + log."""
    write_status("⋯ english checking...")
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        proc = subprocess.run(
            [
                "claude", "-p", "--bare",
                "--model", MODEL,
                "--system-prompt", SYSTEM_PROMPT,
                "--output-format", "text",
            ],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECS,
        )
    except subprocess.TimeoutExpired:
        write_status("⚠ english check timeout")
        append_log([f"[{ts}] session={session_id} TIMEOUT", f"Original: {prompt}"])
        return
    except FileNotFoundError:
        write_status("⚠ english check error")
        append_log([f"[{ts}] session={session_id} ERROR: claude CLI not found"])
        return

    if proc.returncode != 0:
        write_status("⚠ english check error")
        append_log([
            f"[{ts}] session={session_id} ERROR (rc={proc.returncode})",
            f"Original: {prompt}",
            f"Output: {proc.stdout}{proc.stderr}",
        ])
        return

    result = proc.stdout.strip()

    if result == "OK" or result.split("\n")[-1].strip() == "OK":
        write_status("✓ english ok")
        return

    def as_list(value) -> list[str]:
        # Model occasionally returns a string instead of a list; iterating a
        # string would emit one bullet per character.
        if isinstance(value, list):
            return value
        if isinstance(value, str) and value:
            return [value]
        return []

    try:
        data = json.loads(extract_json(result))
        issues = int(data.get("issues", 0))
        fixed = as_list(data.get("fixed"))
        reasons = as_list(data.get("reasons"))
        supplements = as_list(data.get("supplements"))
        translation = data.get("translation", "")
    except (json.JSONDecodeError, ValueError, TypeError):
        # Model returned something we don't understand — log it and move on.
        write_status("⚠ english check error")
        append_log([
            f"[{ts}] session={session_id} UNPARSEABLE",
            f"Original: {prompt}",
            f"Output: {result}",
        ])
        return

    if issues == 0:
        write_status("✓ english ok")
        return

    write_status(f"✗ english: {issues} issues (see log)")
    append_log([
        f"[{ts}] session={session_id}",
        f"Original: {prompt}",
        "Fixed:",
        *(f"  • {f}" for f in fixed),
        "Issues:",
        *(f"  • {r}" for r in reasons),
        "Supplements:",
        *(f"  • {s}" for s in supplements),
        f"Translation: {translation}",
    ])


def clear_prompt(prompt: str) -> str:
    prompt = re.sub(r"```.*?```", "`code segment`", prompt, flags=re.S)
    prompt = re.sub(r"@\S*[/](\S*)", r"\1", prompt)
    return prompt


def spawn_background(prompt: str, session_id: str) -> None:
    """Re-exec self in worker mode, fully detached from the hook."""
    prompt = clear_prompt(prompt)
    env = {**os.environ, "ENGLISH_CHECK_RUNNING": "1"}
    proc = subprocess.Popen(
        [sys.executable, __file__, "--worker", session_id],
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
        env=env,
    )
    proc.stdin.write(prompt.encode())
    proc.stdin.close()


def main() -> int:
    if not DATA_DIR.exists():
        DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Worker mode: invoked by spawn_background, runs the actual API call.
    if len(sys.argv) >= 2 and sys.argv[1] == "--worker":
        session_id = sys.argv[2] if len(sys.argv) >= 3 else ""
        prompt = sys.stdin.read()
        run_check(prompt, session_id)
        return 0

    # Hook mode: parse payload, decide, spawn worker, exit fast.
    if os.environ.get("ENGLISH_CHECK_RUNNING"):
        return 0  # recursion guard (belt + suspenders alongside --bare)

    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        return 0

    prompt = payload.get("prompt", "")
    session_id = payload.get("session_id", "")

    if not prompt:
        append_trigger_log("", "EMPTY")
        return 0

    if should_skip(prompt):
        append_trigger_log(prompt, "SKIP")
        return 0

    append_trigger_log(prompt, "CHECK")
    spawn_background(prompt, session_id)
    return 0


if __name__ == "__main__":
    sys.exit(main())
