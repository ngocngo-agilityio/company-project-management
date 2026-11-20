#!/usr/bin/env bash
# Stop / Notification: show a macOS notification so you know Claude needs you.
if ! command -v jq >/dev/null 2>&1; then
  echo "notify-on-finish: jq is not installed, so no notification was shown." >&2
  exit 1
fi
input=$(cat)
event=$(printf '%s' "$input" | jq -r '.hook_event_name // empty')

if [ "$event" = "Notification" ]; then
  msg=$(printf '%s' "$input" | jq -r '.message // "Claude Code needs your attention"')
else
  msg="Claude Code finished"
fi

if command -v osascript >/dev/null 2>&1; then
  # Pass the text as an argument so quotes and backslashes cannot break the AppleScript.
  osascript \
    -e 'on run argv' \
    -e 'display notification (item 1 of argv) with title "Claude Code" sound name "Glass"' \
    -e 'end run' \
    -- "$msg" >/dev/null 2>&1
fi

exit 0
