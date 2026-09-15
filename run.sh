#!/bin/sh
set -eu

case "${1:-}" in
  '') mode=run ;;
  --validate) mode=validate ;;
  -h|--help)
    printf '%s\n' 'Usage: ./run.sh [--validate]' \
      'Starts Caddy in the foreground, or only validates its configuration.' \
      'Set SITE_ADMIN_PASSWORD_HASH to a Caddy password hash, or enter a password when prompted.' \
      'Stop any existing Caddy service before running a second server on the same ports.'
    exit 0 ;;
  *) printf '%s\n' 'Usage: ./run.sh [--validate]' >&2; exit 2 ;;
esac
[ "$#" -le 1 ] || { printf '%s\n' 'Too many arguments.' >&2; exit 2; }

command -v caddy >/dev/null 2>&1 || {
  printf '%s\n' 'Caddy is required. On macOS, install it with: brew install caddy' >&2
  exit 1
}

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
cd "$script_dir"
export SITE_ROOT="${SITE_ROOT:-./sites}"
[ -d "$SITE_ROOT" ] || {
  printf 'Website directory does not exist: %s\n' "$SITE_ROOT" >&2
  exit 1
}

if [ -z "${SITE_ADMIN_PASSWORD_HASH:-}" ]; then
  if [ ! -t 0 ]; then
    printf '%s\n' 'Set SITE_ADMIN_PASSWORD_HASH to a Caddy-generated hash, or run interactively to enter a password.' >&2
    exit 1
  fi
  printf '%s\n' 'Enter the password to use for admin. Caddy will hash it without echoing it.' >&2
  SITE_ADMIN_PASSWORD_HASH=$(caddy hash-password --algorithm bcrypt)
fi
export SITE_ADMIN_PASSWORD_HASH

# Match the existing Homebrew service data directory unless explicitly overridden.
if [ "$(uname -s)" = Darwin ] && [ -z "${XDG_DATA_HOME:-}" ] && command -v brew >/dev/null 2>&1; then
  XDG_DATA_HOME="$(brew --prefix)/var/lib"
  export XDG_DATA_HOME
fi

caddy validate --config "$script_dir/Caddyfile" --adapter caddyfile
[ "$mode" = validate ] && exit 0
printf '%s\n' 'Starting https://localhost:8443/demo/ as admin. Press Ctrl-C to stop.' >&2
exec caddy run --config "$script_dir/Caddyfile" --adapter caddyfile
