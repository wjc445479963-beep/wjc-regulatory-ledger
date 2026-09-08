import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadTypeScript(relativePath) {
  const source = await readFile(resolve(root, relativePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const [{ regulations, LAST_CHECKED }, logic] = await Promise.all([
  loadTypeScript("app/regulations-data.ts"),
  loadTypeScript("lib/regulation-logic.ts"),
]);

test("公开法规只包含可发布状态并通过数据完整性校验", () => {
  const published = regulations.filter(({ status }) => status === "active" || status === "upcoming");
  assert.ok(published.length > 0);
  assert.equal(published.length, 149, "发布基线变更时必须重新核对并更新测试基线");
  assert.ok(published.every(({ effective, note, href }) => /^(?:\d{4}-\d{2}(?:-\d{2})?|—)$/.test(effective) && note.trim() && /^https?:\/\//.test(href)));
  const vague = published.filter(({ note }) => /待核对|未识别|来源页面为准/.test(note));
  assert.equal(vague.length, 0, vague.map(({ code, note }) => `${code}: ${note}`).join(" | "));
  assert.equal(new Set(published.map(({ code }) => logic.normalizeCode(code))).size, published.length, "公开法规不应有标准号重复");
});

test("公开法规的状态日期和维护日期保持可审计", () => {
  assert.match(LAST_CHECKED, /^2026-09-08$/);
  const upcoming = regulations.filter(({ status }) => status === "upcoming");
  assert.ok(upcoming.every(({ effective }) => /^\d{4}-\d{2}(?:-\d{2})?$/.test(effective)), "即将实施法规必须有实施日期");
  assert.ok(regulations.every(({ updated }) => updated === LAST_CHECKED), "所有记录必须使用同一批次的最后核对日期");
});

test("关键版本替代关系不会把旧版误标为现行", () => {
  const byCode = new Map(regulations.map((record) => [logic.normalizeCode(record.code), record]));
  for (const [oldCode, newCode] of Object.entries({ ...logic.replacementMap, ...logic.upcomingMap })) {
    const oldRecord = byCode.get(logic.normalizeCode(oldCode));
    if (oldRecord) assert.notEqual(oldRecord.status, "active", `${oldCode} 不应与 ${newCode} 同时作为现行版本`);
  }
  for (const [oldCode, newCode, newStatus] of [
    ["GB/T 27025-2008", "GB/T 27025-2019", "active"],
    ["GB/T 19015-2008", "GB/T 19015-2021", "active"],
    ["GB/T 13554-2008", "GB/T 13554-2020", "active"],
    ["YY/T 0466.1-2016", "YY/T 0466.1-2023", "active"],
    ["GB/T 14233.2-2005", "GB/T 14233.2-2025", "upcoming"],
    ["GB/T 16292-2010", "GB/T 16292-2025", "upcoming"],
    ["GB/T 16293-2010", "GB/T 16293-2025", "upcoming"],
    ["GB/T 16294-2010", "GB/T 16294-2025", "upcoming"],
  ]) {
    assert.equal(byCode.get(logic.normalizeCode(oldCode))?.status, "replaced", oldCode);
    assert.equal(byCode.get(logic.normalizeCode(newCode))?.status, newStatus, newCode);
  }
});
