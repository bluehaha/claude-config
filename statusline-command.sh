#!/bin/sh
# Claude Code status line inspired by bullet-train theme
# Segments: dir | git | model | context

input=$(cat)

cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
model=$(echo "$input" | jq -r '.model.display_name // ""')
remaining=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
session=$(echo "$input" | jq -r '.session_name // ""')
total_cost=$(echo "$input" | jq -r '.cost.total_cost_usd // empty')
duration_ms=$(echo "$input" | jq -r '.cost.total_api_duration_ms // empty')

# Dir segment: show last 2 path components
if [ -n "$cwd" ]; then
    parent=$(dirname "$cwd")
    parent_base=$(basename "$parent")
    dir_base=$(basename "$cwd")
    if [ "$parent_base" = "/" ] || [ "$parent_base" = "." ]; then
        dir_seg="$dir_base"
    else
        dir_seg="$parent_base/$dir_base"
    fi
else
    dir_seg="~"
fi

# Git segment: branch name (skip optional locks for safety)
git_seg="no branch"
if [ -n "$cwd" ] && [ -d "$cwd/.git" ] || git -C "$cwd" rev-parse --git-dir > /dev/null 2>&1; then
    branch=$(git -C "$cwd" -c gc.auto=0 symbolic-ref --short HEAD 2>/dev/null || git -C "$cwd" -c gc.auto=0 rev-parse --short HEAD 2>/dev/null)
    if [ -n "$branch" ]; then
        git_seg=" $branch"
    fi
fi

# AI usage segment (line 2) — cached + refreshed in background to avoid blocking
# The usage endpoint is a private webhook; keep it out of version control.
# Set CLAUDE_USAGE_URL in your environment, or put it in ~/.claude/.statusline-env:
#   CLAUDE_USAGE_URL="https://your-host/webhook/xxxx"
[ -f "$HOME/.claude/.statusline-env" ] && . "$HOME/.claude/.statusline-env"
usage_url="${CLAUDE_USAGE_URL:-}"
usage_cache="/tmp/claude-ai-usage.json"
usage_ttl=60

# Refresh cache in the background if missing or stale (only when a URL is configured)
needs_refresh=1
[ -z "$usage_url" ] && needs_refresh=0
if [ -f "$usage_cache" ]; then
    now=$(date +%s)
    cmtime=$(stat -f %m "$usage_cache" 2>/dev/null || stat -c %Y "$usage_cache" 2>/dev/null || echo 0)
    [ $(( now - cmtime )) -lt "$usage_ttl" ] && needs_refresh=0
fi
if [ "$needs_refresh" -eq 1 ]; then
    ( curl -s -m 10 "$usage_url" -o "$usage_cache.tmp" 2>/dev/null \
        && mv "$usage_cache.tmp" "$usage_cache" ) >/dev/null 2>&1 &
fi

# Build usage segment from cache (extract the *NN%* from each formated_message)
usage_seg=""
if [ -f "$usage_cache" ]; then
    pct() { jq -r "$1 // empty" "$usage_cache" 2>/dev/null | sed -n 's/.*\*\([0-9]*%\)\*.*/\1/p'; }
    cl_5h=$(pct '.claude.five_hours.formated_message')
    cl_7d=$(pct '.claude.seven_days.formated_message')
    # cx_5h=$(pct '.codex.five_hours.formated_message')
    # cx_7d=$(pct '.codex.seven_days.formated_message')
    [ -n "$cl_5h$cl_7d" ] && usage_seg="claude ${cl_5h:-?}/${cl_7d:-?}"
    # if [ -n "$cx_5h$cx_7d" ]; then
    #     [ -n "$usage_seg" ] && usage_seg="$usage_seg "
    #     usage_seg="${usage_seg}codex ${cx_5h:-?}/${cx_7d:-?}"
    # fi
fi

# Context segment (line 2)
ctx_seg=""
if [ -n "$remaining" ]; then
    ctx_seg="ctx: ${remaining}%"
else
    ctx_seg="ctx: initializing..."
fi

# Cost segment (line 2)
cost_seg=""
if [ -n "$total_cost" ]; then
    cost_seg=$(printf '$%.4f' "$total_cost")
fi

# Duration segment (line 2)
dur_seg=""
if [ -n "$duration_ms" ]; then
    dur_sec=$(echo "$duration_ms" | awk '{printf "%.1f", $1/1000}')
    dur_seg="${dur_sec}s"
fi

# Line 1: dir | git | model | session
printf " \033[0;36m%s\033[0m" "$dir_seg |"
printf "\033[0;34m%s\033[0m" "$git_seg |"
if [ -n "$model" ]; then
    printf " \033[0;35m%s\033[0m" "$model"
fi
printf "\n"

# Line 2: usage (green) | ctx (green) | cost (yellow) | duration (cyan)
has_line2=0
printf " "
if [ -n "$usage_seg" ]; then
    printf "\033[0;32m%s\033[0m" "$usage_seg |"
    has_line2=1
fi
if [ -n "$ctx_seg" ]; then
    [ $has_line2 -eq 1 ] && printf " "
    # Turn red when context usage reaches 75%, otherwise green
    ctx_color="\033[0;32m"
    if [ -n "$remaining" ] && [ "$remaining" -ge 75 ] 2>/dev/null; then
        ctx_color="\033[0;31m"
    fi
    printf "${ctx_color}%s\033[0m" "$ctx_seg |"
    has_line2=1
fi
if [ -n "$cost_seg" ]; then
    [ $has_line2 -eq 1 ] && printf " "
    printf "\033[0;33m%s\033[0m" "$cost_seg |"
    has_line2=1
fi
if [ -n "$dur_seg" ]; then
    [ $has_line2 -eq 1 ] && printf " "
    printf "\033[0;37m%s\033[0m" "$dur_seg"
    has_line2=1
fi
[ $has_line2 -eq 1 ] && printf "\n"

# Line 3: English check status (only if file fresh within 30s)
status_file="/tmp/claude-english-check/status"
if [ -f "$status_file" ]; then
    now=$(date +%s)
    mtime=$(stat -f %m "$status_file" 2>/dev/null || stat -c %Y "$status_file" 2>/dev/null || echo 0)
    age=$(( now - mtime ))
    if [ "$age" -le 30 ]; then
        msg=$(cat "$status_file")
        first=$(printf '%s' "$msg" | cut -c1-3)
        case "$first" in
            ✓*) color="\033[0;32m" ;;
            ✗*) color="\033[0;33m" ;;
            ⋯*) color="\033[0;90m" ;;
            ⚠*) color="\033[0;31m" ;;
            *)  color="\033[0m" ;;
        esac
        printf " ${color}%s\033[0m\n" "$msg"
    fi
fi
