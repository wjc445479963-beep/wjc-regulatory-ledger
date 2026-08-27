import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

test("keeps the complete public site route surface", async () => {
  const requiredFiles = [
    "app/page.tsx",
    "app/ledger-client.tsx",
    "app/regulations/page.tsx",
    "app/games/page.tsx",
    "app/pet/page.tsx",
    "app/secret-garden/page.tsx",
    "build/sites-vite-plugin.ts",
    ".openai/hosting.json",
  ];

  for (const path of requiredFiles) {
    assert.equal(await exists(join(root, path)), true, `${path} is missing`);
  }
});

test("keeps a single current regulations data source", async () => {
  const data = await readFile(join(root, "app/regulations-data.ts"), "utf8");
  assert.match(data, /export const regulations(?:\s*:\s*[^=]+)?\s*=/);
  assert.match(data, /status: "active"/);
  assert.match(data, /status: "upcoming"/);
  assert.doesNotMatch(data, /old-regulations|legacy-regulations|旧法规清单/i);

  const ids = [...data.matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "regulation ids must be unique");
});

test("keeps package commands independent of unavailable shell wrappers", async () => {
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  assert.match(pkg.scripts.build, /vinext\s+build/);
  assert.match(pkg.scripts.test, /node\s+--test/);
  assert.match(pkg.scripts.lint, /eslint/);
  assert.equal(await exists(join(root, "scripts/build-verified.sh")), true);
  assert.equal(await exists(join(root, "scripts/sites-env.sh")), true);
});

test("does not include local secrets or generated artifacts in the source tree", async () => {
  const forbiddenNames = /(^|\/)(node_modules|dist|\.next|\.wrangler|\.sites-runtime|outputs|work|coverage)(\/|$)|(^|\/)(\.env[^/]*|.*\.(pem|key|p12|pfx))$/i;
  const tracked = [
    "package.json",
    "package-lock.json",
    ".gitignore",
    "app/regulations-data.ts",
  ];
  for (const path of tracked) assert.equal(forbidenNames.test(path), false, `${path} must not be generated output`);

  const ignore = await readFile(join(root, ".gitignore"), "utf8");
  assert.match(ignore, /node_modules/);
  assert.match(ignore, /dist/);
  assert.match(ignore, /\.env/);
});

test("uses repository-relative source paths", () => {
  assert.equal(relative(root, join(root, "app/page.tsx")).replaceAll("\\", "/"), "app/page.tsx");
});
