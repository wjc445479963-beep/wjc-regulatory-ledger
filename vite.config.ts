import { defineConfig } from "vite";
import vinext from "vinext";

const githubPagesBase = process.env.GITHUB_PAGES === "true" ? "/wjc-regulatory-ledger/" : "/";

export default defineConfig({
  base: githubPagesBase,
  plugins: [vinext()],
});
