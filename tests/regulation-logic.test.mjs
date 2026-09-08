import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(resolve(root, "lib/regulation-logic.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const logic = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const current = [
  { code: "YY/T 0325-2022", title: "一次性使用无菌导尿管", category: "医疗器械标准", status: "active", effective: "2023-09-01", updated: "2026-09-08", source: "官方", note: "现行", href: "https://example.com" },
  { code: "GB/T 27025-2019", title: "检测和校准实验室能力的通用要求", category: "质量体系", status: "active", effective: "2020-07-01", updated: "2026-09-08", source: "官方", note: "现行", href: "https://example.com" },
  { code: "ISO 11607-2:2019", title: "包装验证", category: "国际标准", status: "active", effective: "2019-02", updated: "2026-09-08", source: "官方", note: "现行", href: "https://example.com" },
];

test("normalizes common standard number variants without losing the year", () => {
  assert.equal(logic.normalizeCode("YY 0325-2016"), "YY/T0325-2016");
  assert.equal(logic.normalizeCode("GB/T 16886.1—2022"), "GB/T16886.1-2022");
  assert.equal(logic.normalizeCode("ISO 11607-2 2019"), "ISO11607-2:2019");
  assert.equal(logic.extractStandardCode("药品标准 GB/T 16886.1—2022"), "GB/T 16886.1-2022");
});

test("uses explicit version mappings before title matching", () => {
  const [oldYy, oldGb, fake] = logic.compareRows([
    { 标准号: "YY 0325-2016", 法规名称: "一次性使用无菌导尿管" },
    { 标准号: "GB/T 27025-2008", 法规名称: "检测和校准实验室能力的通用要求" },
    { 标准号: "GB/T 16886.1-1900", 法规名称: "包装验证" },
  ], current);
  assert.equal(oldYy.result, "recognized", "unmapped old YY versions must not be promoted by title matching");
  assert.equal(oldGb.result, "replace");
  assert.equal(oldGb.referenceCode, "GB/T 27025-2019");
  assert.equal(fake.result, "recognized", "a mismatched explicit version must not inherit a title match");
});

test("keeps document references and title-only matching separate", () => {
  assert.equal(logic.findCode({ 文件编号: "药监综械管〔2021〕43号", 文件名称: "检查要点" }), "药监综械管〔2021〕43号");
  const [named] = logic.compareRows([{ 法规名称: "检测和校准实验室能力的通用要求" }], current);
  assert.equal(named.result, "active");
});
