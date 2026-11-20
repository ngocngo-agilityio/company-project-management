#!/usr/bin/env bash
# Block commands forbidden by CLAUDE.md ("Never do"). Exit 2 = block and tell Claude why.
block() {
  echo "Blocked: $1" >&2
  exit 2
}

# Fail closed: without jq we cannot read the command, so refuse instead of allowing everything.
command -v jq >/dev/null 2>&1 || block "jq is not installed, so this safety hook cannot check the command. Install jq (brew install jq)."
cmd=$(jq -r '.tool_input.command // empty') || block "could not parse the hook input."

# Match on the raw command (no quote stripping, which can be abused to hide commands).
# This may rarely block a message that merely mentions a forbidden command; that is accepted.
code=$(printf '%s' "$cmd" | tr '\n' ' ')

# For the `commit -n` check only, blank out the message text after -m/--message, so
# `git commit -m "add -n flag"` is not mistaken for `git commit -n`. The flag itself is kept (-nm still blocks).
sq="'"
commit_check=$(printf '%s' "$code" | sed -E "s/((-[a-zA-Z]*m|--message)[ =]*)(\"[^\"]*\"|${sq}[^${sq}]*${sq})/\1X/g")

echo "$commit_check" | grep -Eq -- 'git( .*)? commit( .*)? -[a-zA-Z]*n[a-zA-Z]*( |$)' &&
  block "do not skip git hooks (-n). Run 'pnpm run typecheck' and 'pnpm run lint', fix errors, then commit."

echo "$code" | grep -Eq -- '--no-verify|HUSKY(_SKIP_HOOKS)?=|core\.hooksPath' &&
  block "do not skip git hooks (--no-verify, -n, HUSKY=0, core.hooksPath). Run 'pnpm run typecheck' and 'pnpm run lint', fix errors, then commit."

echo "$code" | grep -Eq 'git( +-[^ ]+( +[^ -][^ ]*)?)* +push( .*)? (--force|-[a-zA-Z]*f[a-zA-Z]*( |$)|\+[^ ])' &&
  block "do not force push. Use a normal 'git push'."

echo "$code" | grep -Eq 'prisma +(migrate +reset|db +push)' &&
  block "never run 'prisma migrate reset' or 'prisma db push' (real Supabase DB). Use 'prisma migrate dev --name <name>'."

echo "$code" | grep -Eq '(^|[;&|] *)(npm +(install|i|add|ci)|yarn( +(add|install))?)( |$)' &&
  block "this repo uses pnpm only. Use 'pnpm add' / 'pnpm install'."

echo "$code" | grep -Eq 'git +reset +--hard|git +clean +.*(-[a-zA-Z]*f|--force)|git +(checkout|restore) +(-- +)?\.( |$)' &&
  block "destructive git command. Ask the user first."

# Reading .env files (allow .env.example). Only commands that read a file, or a `<` redirect, count;
# merely mentioning ".env" in text, or `cp .env.example .env`, is fine.
env_check=$(printf '%s' "$code" | sed 's/\.env\.example/ENVEXAMPLE/g')
env_path='(^|[[:space:]/="'"'"'])\.env([^[:alnum:]_]|$)'
readers='(cat|less|more|head|tail|bat|nl|tac|source|grep|rg|awk|sed|strings|xxd|od|base64|diff|sort|cut|xargs|open|code|vi|vim|nano|tee|scp|rsync|tar|zip|curl|wget|jq|yq|python3?|node|ruby|perl|php|env|printenv|dotenv)'
# `reader <args> .env`: the path may directly follow the reader, so the separator is part of the path group.
env_arg='([[:space:]][^;&|]*)?[[:space:]/="@'"'"']\.env([^[:alnum:]_]|$)'
# cp/mv only read their first operand (so `cp .env.example .env` stays allowed).
copy_src='(cp|mv)[[:space:]]+(-[^[:space:]]+[[:space:]]+)*[^;&|[:space:]]*\.env([^[:alnum:]_]|$)'
echo "$env_check" | grep -Eq "(^|[;&|(] *)${readers}${env_arg}|(^|[;&|(] *)${copy_src}|<[[:space:]]*[^[:space:]]*\.env([^[:alnum:]_]|\$)" &&
  block "do not read .env files. Variable names are in .env.example."

exit 0
