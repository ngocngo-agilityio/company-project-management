#!/usr/bin/env bash
# After Edit/Write: format the file with prettier, then eslint --fix for code files.
if ! command -v jq >/dev/null 2>&1; then
  echo "format-on-edit: jq is not installed, so the file was not formatted." >&2
  exit 2
fi
file=$(jq -r '.tool_input.file_path // empty')
[ -n "$file" ] && [ -f "$file" ] || exit 0

# prettier skips these through .prettierignore; this keeps eslint away from them too.
case "$file" in
  */node_modules/* | */dist/* | */generated/* | */.turbo/*) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Call the local binaries directly: `pnpm exec` adds about a second of startup per call.
run() {
  if [ -x "node_modules/.bin/$1" ]; then
    "node_modules/.bin/$1" "${@:2}"
  else
    pnpm exec "$@"
  fi
}

case "$file" in
  *.ts | *.tsx | *.js)
    # Surface prettier and eslint problems to Claude (exit 2 shows stderr) instead of hiding them.
    # Files listed in .prettierignore are skipped by prettier itself.
    if ! out=$(run prettier --write "$file" 2>&1); then
      echo "$out" >&2
      exit 2
    fi
    if ! out=$(run eslint --fix "$file" 2>&1); then
      echo "$out" >&2
      exit 2
    fi
    ;;
  *.json | *.md | *.css | *.yaml | *.yml)
    if ! out=$(run prettier --write "$file" 2>&1); then
      echo "$out" >&2
      exit 2
    fi
    ;;
esac

exit 0
