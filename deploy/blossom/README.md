# Deploy to Blossom

Blossom serves the static Astro build with an internal Caddy container. The shared Caddy proxy handles HTTPS on the existing `edge` network.

## Build and publish

Run `pnpm install --frozen-lockfile` after dependency changes and `pnpm build` before publishing. Include both the source changes and the updated `dist/` in the same signed commit to `main`.

## First installation

On Blossom, create `/srv/sites/committedsins.dev` owned by `mjs`. Clone the public repository into it with `--branch main --single-branch`. Run the following in that checkout:

```sh
sudo docker compose -f deploy/blossom/compose.yaml config --quiet
sudo docker compose -f deploy/blossom/compose.yaml run --rm --no-deps website caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo docker compose -f deploy/blossom/compose.yaml up -d --wait
sudo docker exec aureka-proxy-caddy-caddy-1 wget -q -O /dev/null http://committedsins-website:80/
```

Enable `site-pull@committedsins.dev.timer` after the first successful pull. The installed timer fast-forwards this checkout to `origin/main`. The container serves the resulting `dist/` directly. Changes to Caddy or Compose still require a manual reload or recreation.

## Public routes

Add `committedsins-website.caddy` to the shared proxy using its existing `sites-enabled` workflow. Validate the candidate with the current proxy configuration before activating it, then reload the proxy in place. Set the web DNS records for `committedsins.dev` to Blossom and verify HTTPS and the Imprint page.

Once the primary domain works, add the web DNS records for `committedsins.com` and activate `committedsins-redirect.caddy` with the same validate-and-reload workflow. Verify that the response is permanent and preserves the original path and query string. Keep mail records in both DNS zones as they are.
