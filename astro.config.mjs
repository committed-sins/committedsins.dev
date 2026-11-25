import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://committedsins.dev",
  output: "static",
  build: { inlineStylesheets: "never" },
  devToolbar: { enabled: false },
});
