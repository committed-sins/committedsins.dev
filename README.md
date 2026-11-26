# Committed Sins

The personal website of Michael J. Stallinger. Built with Astro and Markdown.

## Run locally

Use Node.js 24 or later and pnpm. For a full preview of the project directory, also install Caddy 2.11.4.

```sh
pnpm install
pnpm dev
```

`pnpm dev` serves the Astro layout and editorial pages. The project directory is rendered by Caddy. To preview it with the same configuration as Blossom, run these commands from the repository root in PowerShell:

```powershell
pnpm build
$env:COMMITTEDSINS_HTTP_ADDRESS = 'http://127.0.0.1:4323'
$env:COMMITTEDSINS_SITE_ROOT = (Resolve-Path dist).Path
$env:COMMITTEDSINS_STATE_ROOT = Join-Path $PWD '.blossom'
node deploy/blossom/refresh-projects.mjs (Join-Path $env:COMMITTEDSINS_STATE_ROOT 'data')
caddy run --config deploy/blossom/Caddyfile --adapter caddyfile
```

Open `http://127.0.0.1:4323/`. Re-run the snapshot command to pick up GitHub changes. Set `PROFILE_README_PATH` before that command to preview edits from a local profile README.

## Add content

- For an article, copy `templates/article.md` into `src/content/writing/`, name the file with its URL slug, and fill out the frontmatter and body. Update the date and set `draft: false` when the article is ready. Drafts appear in the dev server and stay out of the production build. Keep private drafts outside this public repo.
- Optional editorial introductions in `src/content/projects/` appear on the corresponding project area pages. Match the filename to the area's slug. Update the Aureka detail page and its homepage entry in `src/content/company/aureka.md`.

`pnpm build` generates the site layout in `dist/`. The build reads local content and assets. Caddy renders the project directory at request time.

Push signed source commits to `main` to start the **Build for Blossom** GitHub workflow. You can also start it from the Actions tab. See the [Blossom deployment notes](deploy/blossom/README.md) for setup and troubleshooting.

## Update the project directory

The **Project areas** table in the [Committed Sins GitHub profile README](https://github.com/committed-sins/.github/blob/main/profile/README.md) defines one project page per row, in table order. For a new area, choose the **Slug** from its title and keep that slug when changing the title later. New areas, title changes, and a different order take effect on the next successful refresh. Company is authored separately in `src/content/company/`.

Add the configured topic to a public repository in the organization to list it in that area. The site uses the repo description or a plain-text paragraph under an optional `## Summary` heading in the repo README. Each area has a single list ordered by **Published**, **Preview**, and **Development**. The version links directly to its GitHub release. An Obsidian directory listing, a live website link, or the latest release being stable marks a project as **Published**. For Obsidian plugins, the directory listing determines publication. An available release without publication is a **Preview**. A project without either is in **Development**. Blossom deployment releases are excluded from the website's release history on the project page.

The Blossom timer updates project areas, repositories, and releases hourly. Caddy reads the current snapshot when serving the homepage and project pages. If GitHub is unavailable, the last successful snapshot stays in use.
