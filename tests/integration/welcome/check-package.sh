#!/bin/sh
# Each deployable function gets its own sources plus _shared.
set -eu
root=$(git rev-parse --show-toplevel)
bundle=$(mktemp -d)
trap 'rm -rf "$bundle"' EXIT
for name in send-email confirmed-welcome; do
  mkdir -p "$bundle/$name/functions"
  cp -R "$root/supabase/functions/$name" "$root/supabase/functions/_shared" "$bundle/$name/functions/"
  deno check --no-lock "$bundle/$name/functions/$name/index.ts"
done
