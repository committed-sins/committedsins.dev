import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://committedsins.dev",
  output: "static",
  redirects: {
    "/projects": "/#projects",
    "/projects/aureka": "/company/",
  },
  build: { inlineStylesheets: "never" },
  // Blossom's content security policy requires external scripts.
  vite: { build: { assetsInlineLimit: 0 } },
  devToolbar: { enabled: false },
});
