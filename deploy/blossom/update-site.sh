#!/usr/bin/env bash
set -euo pipefail
umask 022

revision=$(git rev-parse HEAD)
state="$PWD/.blossom"
release="releases/$revision"
base="https://github.com/committed-sins/committedsins.dev/releases/download/blossom-$revision"

install -d -m 755 "$state" "$state/releases"
exec 9>"$state/lock"
flock -n 9 || exit 0

if [[ $(readlink "$state/site" || true) == "$release" ]]; then
  exit 0
fi

staging=$(mktemp -d "$state/.build.XXXXXX")
trap 'rm -rf -- "$staging"' EXIT

if [[ ! -d "$state/$release" ]]; then
  curl_options=(--silent --show-error --location --proto '=https' --connect-timeout 8 --max-time 25)
  status=$(curl "${curl_options[@]}" --output "$staging/site.sha256" --write-out '%{http_code}' "$base/site.sha256")
  case "$status" in
    200) ;;
    404)
      printf 'Waiting for the GitHub build for %s\n' "$revision"
      exit 0
      ;;
    *)
      printf 'Could not download the build checksum (HTTP %s)\n' "$status" >&2
      exit 1
      ;;
  esac

  expected=$(<"$staging/site.sha256")
  [[ "$expected" =~ ^[a-f0-9]{64}$ ]]
  curl "${curl_options[@]}" --fail --output "$staging/site.tar.gz" "$base/site.tar.gz"
  actual=$(sha256sum "$staging/site.tar.gz")
  if [[ "${actual%% *}" != "$expected" ]]; then
    printf 'Build checksum mismatch for %s\n' "$revision" >&2
    exit 1
  fi

  # Caddy serves these files directly, so accept only directories and regular files.
  tar -tvzf "$staging/site.tar.gz" > "$staging/entries"
  if grep -qE '^[^-d]' "$staging/entries"; then
    printf 'Unexpected archive entry type for %s\n' "$revision" >&2
    exit 1
  fi
  install -d -m 755 "$staging/site"
  tar -xzf "$staging/site.tar.gz" --no-same-owner --no-same-permissions -C "$staging/site"
  test -s "$staging/site/index.html"
  test -s "$staging/site/imprint/index.html"
  mv -- "$staging/site" "$state/$release"
fi

# A pull can happen while a build downloads during initial setup.
test "$(git rev-parse HEAD)" = "$revision"
ln -s -- "$release" "$staging/next"
mv -T -- "$staging/next" "$state/site"
printf 'Activated GitHub build %s\n' "$revision"
