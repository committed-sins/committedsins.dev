# Deploy to Blossom

Blossom serves the static Astro build with an internal Caddy container. The shared Caddy proxy handles HTTPS on the existing `edge` network.

## Build and publish

The **Build for Blossom** workflow runs when a signed source commit lands on `main`. To start it manually, choose **Actions → Build for Blossom → Run workflow** on `main`. The workflow publishes the static site and its SHA-256 checksum as assets on a pre-release named `blossom-<commit SHA>`.

The site-specific pull service fetches `main`, then checks for the build for that exact commit. It retries on the next timer run while the build is pending. After verifying and unpacking the archive into `.blossom/releases/`, it atomically changes the `.blossom/site` symlink. The previous release remains on disk.

## First installation

On a fresh host, create `/srv/sites/committedsins.dev` owned by `mjs` and clone the public repository with `--branch main --single-branch`. On the existing Blossom checkout, pull `main` first. As `mjs`, run:

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

Apply changes to the installed script or drop-in with `install` and reload systemd. Changes to Caddy or Compose still require a manual reload or recreation. When checking a failed run, use `journalctl -u site-pull@committedsins.dev.service` and compare `readlink .blossom/site` with `git rev-parse HEAD`.

The website container returns HTTP 301 for the old `/projects/` and `/projects/aureka/` routes. Astro keeps HTML redirects for local static preview.

## Refresh project data

The project timer reads public GitHub data and the Obsidian Community directory hourly. It atomically replaces `.blossom/data/projects.json` after a successful refresh. Caddy renders the project overview and each detail page from that file when serving a request. New areas and repository updates go live without a site build, container restart, or Caddy reload. The last successful snapshot stays in use when a refresh fails.

For the first rollout, publish the profile README with the **Project areas** table and update the site checkout. Check that Node.js 24 or later is available in the systemd executable search path. Install the units and generate the first snapshot before recreating the website container with the new Caddyfile.

```sh
cd /srv/sites/committedsins.dev
sudo install -m 644 deploy/blossom/committedsins-projects.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start committedsins-projects.service
test -s .blossom/data/projects.json
sudo systemctl enable --now committedsins-projects.timer
```

Validate and recreate the website container to load the updated Caddyfile. Check `https://committedsins.dev/data/projects.json` after recreation. Use `journalctl -u committedsins-projects.service` if the refresh fails.

## Public routes

Add `committedsins-website.caddy` to the shared proxy using its existing `sites-enabled` workflow. Validate the candidate with the current proxy configuration before activating it, then reload the proxy in place. Set the web DNS records for `committedsins.dev` to Blossom and verify HTTPS and the Imprint page.

Once the primary domain works, add the web DNS records for `committedsins.com` and activate `committedsins-redirect.caddy` with the same validate-and-reload workflow. Verify that the response is permanent and preserves the original path and query string. Keep mail records in both DNS zones as they are.
