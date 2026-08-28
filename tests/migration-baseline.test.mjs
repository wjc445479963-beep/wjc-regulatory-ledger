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
  assert.match(data, /code: "YY\/T 0466\.2-2015".*status: "active"/);
  assert.doesNotMatch(data, /^\+\s+item\(/m);
  assert.doesNotMatch(data, /old-regulations|legacy-regulations|旧法规清单/i);

  const ids = [...data.matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "regulation ids must be unique");
});

test("makes comparison summary cards filter their detail rows", async () => {
  const client = await readFile(join(root, "app/ledger-client.tsx"), "utf8");
  assert.match(client, /comparisonFilter/);
  assert.match(client, /const visibleRows = filter === "all"/);
  assert.match(client, /aria-pressed=\{active\}/);
  assert.match(client, /onFilter\(filter === "replace" \? "all" : "replace"\)/);
});

test("keeps the public build free of runtime auth and review controls", async () => {
  const client = await readFile(join(root, "app/ledger-client.tsx"), "utf8");
  const page = await readFile(join(root, "app/regulations/page.tsx"), "utf8");
  assert.match(client, /item\.status !== "replaced" && item\.status !== "review"/);
  assert.doesNotMatch(client, /getChatGPTUser|signInHref|ReviewToolbar|管理员导出全库/);
  assert.match(client, /addComparisonProvenance\(parsed\.rows, publicRegulations\)/);
  assert.match(client, /const reference = sourceRegulations\.find/);
  assert.doesNotMatch(page, /force-dynamic|getChatGPTUser|signin-with-chatgpt|local_admin/);
  assert.doesNotMatch(page, /公开静态版/);
});

test("keeps original fields and provenance in comparison exports", async () => {
  const client = await readFile(join(root, "app/ledger-client.tsx"), "utf8");
  assert.match(client, /原清单版本号/);
  assert.match(client, /原清单来源/);
  assert.match(client, /主库最后核对/);
  assert.match(client, /来源依据/);
  assert.match(client, /官方来源链接/);
});

test("uses the requested secret garden key and music door", async () => {
  const page = await readFile(join(root, "app/secret-garden/page.tsx"), "utf8");
  assert.match(page, /normalized === "wjc"/);
  assert.doesNotMatch(page, /wjc666|"666"/);
  assert.match(page, /https:\/\/163cn\.tv\/bexp6IId/);
});

test("explains how to launch the Doupi desktop download", async () => {
  const page = await readFile(join(root, "app/pet/page.tsx"), "utf8");
  assert.match(page, /下载后请先解压缩/);
  assert.match(page, /install-and-run\.cmd/);
  assert.match(page, /完成安装和启动/);
});

test("keeps the recovered comparison records and public workbook export", async () => {
  const data = await readFile(join(root, "app/regulations-data.ts"), "utf8");
  const client = await readFile(join(root, "app/ledger-client.tsx"), "utf8");
  const workbook = await readFile(join(root, "app/excel-utils.ts"), "utf8");
  assert.equal((data.match(/id: "imported-compare-/g) ?? []).length, 313);
  assert.equal((data.match(/category: "CFDA法律法规"/g) ?? []).length >= 214, true);
  assert.match(data, /status: "review", effective: "待核对"/);
  assert.match(data, /filter\(\(\{ status \}\) => status !== "review"\)/);
  assert.match(client, /导出公开法规 Excel/);
  assert.match(client, /downloadRegulationsWorkbook\("法规主库\.xlsx", publicRegulations\)/);
  assert.match(workbook, /record\.status === "active"/);
  assert.match(workbook, /record\.status === "upcoming"/);
  assert.match(workbook, /record\.status === "review"/);
  for (const sheet of ["现行法规", "即将实施", "待核对", "CFDA法律法规", "YY", "GB", "ISO", "ASTM", "美国医疗器械法规", "欧盟医疗器械法规"]) {
    assert.match(workbook, new RegExp(sheet));
  }
});

test("keeps public status cards limited to published statuses", async () => {
  const client = await readFile(join(root, "app/ledger-client.tsx"), "utf8");
  assert.match(client, /const statusFiltered = useMemo/);
  assert.match(client, /const categoryCounts = useMemo/);
  assert.match(client, /categoryCounts\[item\]/);
  assert.match(client, /onClick=\{\(\) => jumpToStatus\("active"\)\}/);
  assert.match(client, /onClick=\{\(\) => jumpToStatus\("upcoming"\)\}/);
  assert.doesNotMatch(client, /jumpToStatus\("review"\)|批量确认现行|批量确认即将实施|生成辅助建议/);
});

test("configures a static GitHub Pages export", async () => {
  const config = await readFile(join(root, "next.config.ts"), "utf8");
  const workflow = await readFile(join(root, ".github/workflows/deploy-pages.yml"), "utf8");
  assert.match(config, /output: "export"/);
  assert.match(config, /trailingSlash: true/);
  assert.match(config, /GITHUB_PAGES/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /path: \.\/dist\/client/);
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
  for (const path of tracked) assert.equal(forbiddenNames.test(path), false, `${path} must not be generated output`);

  const ignore = await readFile(join(root, ".gitignore"), "utf8");
  assert.match(ignore, /node_modules/);
  assert.match(ignore, /dist/);
  assert.match(ignore, /\.env/);
});

test("uses repository-relative source paths", () => {
  assert.equal(relative(root, join(root, "app/page.tsx")).replaceAll("\\", "/"), "app/page.tsx");
});
