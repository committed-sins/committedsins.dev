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
- For a project, use an existing file in `src/content/projects/` as a starting point. The homepage displays the first three projects by `order`.

`pnpm build` generates the static site in `dist/`. Use `pnpm preview` to view that output locally.

When publishing, rebuild and include the updated `dist/` alongside the source changes in your signed commit to `main`. Blossom serves that build after its next pull. See the [Blossom deployment notes](deploy/blossom/README.md) for how the timer and proxy fit together.
