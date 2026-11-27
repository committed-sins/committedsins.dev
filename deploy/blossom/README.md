# Deploy to Blossom

Blossom serves the static Astro build with an internal Caddy container. The shared Caddy proxy handles HTTPS on the existing `edge` network.

## Build and publish

Only published GitHub releases go live; merging to `main` does not deploy. Publish a release with a new tag on `main`, such as `v0.3.0` (letters, digits, `.`, `_`, `-`). Pre-releases are not deployed.

The **Release** workflow builds the tagged files with `SITE_VERSION` set to the tag, so the footer shows the version and links to its release. It commits the tagged files to the branch `release`. Each release commit has the previous one as a parent, so the branch only ever fast-forwards, also for a rollback. The workflow then publishes the static site and its SHA-256 checksum as assets on a pre-release named `blossom-<release commit SHA>`. To deploy an older release again, choose **Actions → Release → Run workflow** and enter its tag.

The site-specific pull service fetches `release`, then checks for the build for that exact commit. It retries on the next timer run while the build is pending. After verifying and unpacking the archive into `.blossom/releases/`, it atomically changes the `.blossom/site` symlink. The previous release remains on disk.

## First installation

On a fresh host, create `/srv/sites/committedsins.dev` owned by `mjs` and clone the public repository with `--branch release --single-branch`. As `mjs`, run:

```sh
cd /srv/sites/committedsins.dev
bash deploy/blossom/update-site.sh
test -s .blossom/site/index.html

sudo install -D -m 755 deploy/blossom/update-site.sh /usr/local/libexec/committedsins-update-site
sudo install -D -m 644 deploy/blossom/site-build.conf \
  /etc/systemd/system/site-pull@committedsins.dev.service.d/build.conf
sudo systemctl daemon-reload
sudo systemctl start site-pull@committedsins.dev.service

sudo docker compose -f deploy/blossom/compose.yaml config --quiet
sudo docker compose -f deploy/blossom/compose.yaml run --rm --no-deps website caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo docker compose -f deploy/blossom/compose.yaml up -d --wait
sudo docker exec aureka-proxy-caddy-caddy-1 wget -q -O /dev/null http://committedsins-website:80/
sudo systemctl enable --now site-pull@committedsins.dev.timer
```

A checkout that still follows `main` switches to `release` once, after the first release exists:

```sh
cd /srv/sites/committedsins.dev
git status --short   # must be empty
git remote set-branches origin release
git fetch origin && git switch release
git status -sb       # ## release...origin/release
```

Apply changes to the installed script or drop-in with `install` and reload systemd. Changes to Caddy or Compose still require a manual reload or recreation. When checking a failed run, use `journalctl -u site-pull@committedsins.dev.service` and compare `readlink .blossom/site` with `git rev-parse HEAD`.

The website container serves the project overview at `/projects/` and organization overviews under `/organization/`. Retired project and organization URLs return HTTP 404.

## Caching

HTML and other files are served with `Cache-Control: no-cache`, so browsers revalidate them on every use and see a new release at once. Files below `/_astro/` carry a content hash in their name and are cached for a year as `immutable`.

## Refresh project data

The project timer reads public GitHub data and the Obsidian Community directory hourly. It atomically replaces each profile snapshot under `.blossom/data/` after a successful refresh. Caddy renders introductions, project overviews, and detail pages from those snapshots. The personal project list is also available at `/data/projects.json`. New areas and repository updates go live without a site build, container restart, or Caddy reload. The last successful snapshot stays in use when a refresh fails.

The service runs Node.js 24 using a pinned Docker image and writes the snapshot as `mjs`.

For the first installation of the project refresh, make sure the profile README has the **Project areas** table and the active build contains `project-directory-template/directory/index.html`. Install the units and generate the first snapshot before loading the website Caddyfile.

```sh
cd /srv/sites/committedsins.dev
git pull --ff-only
sudo install -m 644 deploy/blossom/committedsins-projects.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start committedsins-projects.service
test -s .blossom/data/projects.json
```

Validate and recreate the website container to load the updated Caddyfile, then enable `committedsins-projects.timer` and `site-pull@committedsins.dev.timer`. Check `https://committedsins.dev/data/projects.json` after activation. Use `journalctl -u committedsins-projects.service` if the refresh fails.

## Public routes

Add `committedsins-website.caddy` to the shared proxy using its existing `sites-enabled` workflow. Validate the candidate with the current proxy configuration before activating it, then reload the proxy in place. Set the web DNS records for `committedsins.dev` to Blossom and verify HTTPS and the Imprint page.

Once the primary domain works, add the web DNS records for `committedsins.com` and activate `committedsins-redirect.caddy` with the same validate-and-reload workflow. Verify that the response is permanent and preserves the original path and query string. Keep mail records in both DNS zones as they are.
