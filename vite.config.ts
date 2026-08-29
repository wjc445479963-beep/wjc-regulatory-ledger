import { defineConfig } from "vite";
import vinext from "vinext";

const githubPagesBase =
  process.env.GITHUB_PAGES === "true" && process.env.GITHUB_PAGES_PROJECT_SITE === "true"
    ? "/wjc-regulatory-ledger/"
    : "/";

export default defineConfig({
  base: githubPagesBase,
  plugins: [vinext()],
});
