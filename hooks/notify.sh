#!/bin/bash

# Claude Code Notification Hook
# Sends macOS notification when Claude Code needs user input or permissions

read -r input

TITLE="Claude Code"
MESSAGE=$(echo "$input" | jq -r '.message')
CWD=$(echo "$input" | jq -r '.cwd')
CWD=$(basename "$CWD")
MESSAGE="In $CWD, $MESSAGE"

# Send notification using osascript (AppleScript)
osascript -e "display notification \"$MESSAGE\" with title \"$TITLE\" sound name \"$SOUND\""

exit 0
