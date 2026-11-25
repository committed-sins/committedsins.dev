# Committed Sins

The personal website of Michael J. Stallinger. Built with Astro and Markdown.

## Run locally

Use Node.js 24 or later and pnpm.

```sh
pnpm install
pnpm dev
```

## Add content

- For an article, copy `templates/article.md` into `src/content/writing/`, name the file with its URL slug, and fill out the frontmatter and body. Update the date and set `draft: false` when the article is ready. Drafts appear in the dev server and stay out of the production build. Keep private drafts outside this public repo.
- Local project entries in `src/content/projects/` are ordered by `order`. Files with `profile: true` add site-specific copy to a matching GitHub section. Update the standalone Company page and its homepage entry in `src/content/company/aureka.md`.

`pnpm build` generates the static site in `dist/`. Use `pnpm preview` to view that output locally.

Push signed source commits to `main` to start the **Build for Blossom** GitHub workflow. You can also start it from the Actions tab. See the [Blossom deployment notes](deploy/blossom/README.md) for setup and troubleshooting.

## Update the project directory

Edit the [Committed Sins GitHub profile README](https://github.com/committed-sins/.github/blob/main/profile/README.md). Astro builds one project page for each `##` section containing a project table, in README order. The browser refreshes the rows and section links on each project page and keeps the static copy if the fetch or parsing fails. New or renamed sections need a site build to update the overview and routes. GitHub may cache README edits briefly.

- Put a one-line description below the heading for the project card. Add any standalone HTTPS Markdown links before the table to include them on the project page.
- Use `Project` (or `Plugin`), `What it does`, and `Status` as the table columns. Put each entry on one line, link its name to its repository in the `committed-sins` organization, and write the description as plain text without pipes.
- Use plain text or one HTTPS Markdown link for general project statuses. In **Obsidian Community plugins**, use `Test preview`, `Development preview`, `In development`, `Design stage`, or a `[GitHub release](https://github.com/committed-sins/obsidian-plugin-<slug>/releases/latest)` link. Preview rows appear under **In development**.
- End the table with a blank line before adding more content to the section.
