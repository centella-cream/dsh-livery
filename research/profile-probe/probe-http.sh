#!/usr/bin/env bash
# HTTP acceptance probe for an already-running dsh web profile (no browser).
#   research/profile-probe/probe-http.sh \
#     --log research/profile-probe/.run/web.log \
#     --out research/profile-probe/.run \
#     --plugin dsh-livery
# Exit 0 = 401/303/200/403 checks and the plugin bundle route all behaved as expected.
set -uo pipefail

LOG=""; OUT=""; PLUGIN="dsh-livery"
while [ $# -gt 0 ]; do
  case "$1" in
    --log) LOG="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --plugin) PLUGIN="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[ -n "$LOG" ] && [ -n "$OUT" ] || { echo "usage: probe-http.sh --log <web.log> --out <dir> [--plugin dsh-livery]" >&2; exit 2; }
mkdir -p "$OUT"

# 1. Readiness: the single "dsh web: <authenticated URL>" line.
line=$(grep -m1 '^dsh web:' "$LOG" || true)
if [ -z "$line" ]; then echo "FAIL: no 'dsh web:' line in $LOG (server not ready or boot failed)" >&2; exit 1; fi
token_url=$(printf '%s\n' "$line" | sed -e 's/^dsh web: //' -e 's/ (LAN:.*$//')
base=$(printf '%s\n' "$token_url" | sed -E 's#(https?://[^/]+)/.*#\1#')
token=$(printf '%s\n' "$token_url" | grep -o 'token=[0-9A-Za-z._~-]*' | cut -d= -f2)
printf 'base=%s token=%s…\n' "$base" "${token:0:8}"

jar="$OUT/cookies.txt"; rm -f "$jar"
fail=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then printf 'ok   %-28s %s\n' "$1" "$3"
  else printf 'FAIL %-28s expected %s got %s\n' "$1" "$2" "$3"; fail=1; fi
}

# 2. Fence + auth: no cookie -> 401; token on GET / -> 303 + Set-Cookie; cookie -> 200.
check "index without cookie" 401 "$(curl -s -o /dev/null -w '%{http_code}' "$base/")"
curl -s -D "$OUT/redirect.headers" -o /dev/null -c "$jar" "$base/?token=$token"
check "token exchange" 303 "$(awk 'NR==1{print $2}' "$OUT/redirect.headers")"
check "cookie issued" yes "$(grep -qi '^set-cookie:.*HttpOnly' "$OUT/redirect.headers" && echo yes || echo no)"
check "index with cookie" 200 "$(curl -s -b "$jar" -o "$OUT/index.html" -w '%{http_code}' "$base/")"
check "bad Host refused" 403 "$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: evil.example' "$base/")"
check "cross-site Origin refused" 403 "$(curl -s -o /dev/null -w '%{http_code}' -H 'Origin: http://evil.example' "$base/")"

# 3. Boot graph carries the plugin, and its exact revisioned bundle URL serves JavaScript.
if [ -f "$OUT/index.html" ] && grep -q "\"id\":\"$PLUGIN\"" "$OUT/index.html"; then
  printf 'ok   %-28s %s\n' "boot row present" "$PLUGIN"
else
  printf 'FAIL %-28s %s missing from __DSH_BOOT__\n' "boot row present" "$PLUGIN"; fail=1
fi
bundle=$(grep -o "/plugins/$PLUGIN/client\\.js?rev=[^\"]*" "$OUT/index.html" | head -1)
if [ -n "$bundle" ]; then
  code=$(curl -s -o "$OUT/client.js" -w '%{http_code}' "$base$bundle")
  ctype=$(file -b --mime-type "$OUT/client.js" 2>/dev/null || echo '?')
  check "plugin client.js" 200 "$code"
  printf '     url=%s bytes=%s type=%s\n' "$bundle" "$(wc -c < "$OUT/client.js" | tr -d ' ')" "$ctype"
  # A bundle URL without the graph's rev is not served.
  check "client.js without rev" 404 "$(curl -s -o /dev/null -w '%{http_code}' "$base/plugins/$PLUGIN/client.js")"
else
  printf 'FAIL %-28s no /plugins/%s/client.js?rev= in index\n' "plugin bundle url" "$PLUGIN"; fail=1
fi

# 4. Host log must not report the bundle as skipped or broken.
if grep -Eiq "skipped bundle|skippedBundles|client-modules:.*$PLUGIN" "$LOG"; then
  printf 'FAIL %-28s boot log reports a skipped/broken bundle\n' "boot log clean"; fail=1
else
  printf 'ok   %-28s\n' "boot log clean"
fi

exit "$fail"
