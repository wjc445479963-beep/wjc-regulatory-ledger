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
  assert.equal(published.length, 282, "发布基线变更时必须重新核对并更新测试基线");
  assert.ok(published.every(({ effective, note, href }) => /^(?:\d{4}-\d{2}(?:-\d{2})?|—)$/.test(effective) && note.trim() && /^https?:\/\//.test(href)));
  const vague = published.filter(({ note }) => /待核对|未识别|来源页面为准/.test(note));
  assert.equal(vague.length, 0, vague.map(({ code, note }) => `${code}: ${note}`).join(" | "));
  assert.equal(new Set(published.map(({ code }) => logic.normalizeCode(code))).size, published.length, "公开法规不应有标准号重复");
});

test("公开法规的状态日期和维护日期保持可审计", () => {
  assert.match(LAST_CHECKED, /^2026-10-10$/);
  const upcoming = regulations.filter(({ status }) => status === "upcoming");
  assert.ok(upcoming.every(({ effective }) => /^\d{4}-\d{2}(?:-\d{2})?$/.test(effective)), "即将实施法规必须有实施日期");
  assert.ok(regulations.every(({ updated }) => /^\d{4}-\d{2}-\d{2}$/.test(updated)), "逐条核验日期必须可审计");
  const supplemented = regulations.filter(({ updated }) => updated === "2026-10-10");
  assert.equal(supplemented.length, 56, "18条原增量记录、35条器审中心补漏及3条既有记录更新逐条日期");
  assert.ok(regulations.filter(({ updated }) => updated !== "2026-10-10").every(({ updated }) => updated === "2026-09-25"), "未重新核验的记录不得冒用增量维护日期");
  const gmpGuideline = regulations.find(({ id }) => id === "cn-gmp-inspection-guideline-2026");
  assert.equal(gmpGuideline?.code, "国药监械管〔2026〕14号");
  assert.equal(gmpGuideline?.status, "upcoming");
  assert.equal(gmpGuideline?.effective, "2026-11-01");
});

test("胶原蛋白新增文件去重、范围和0954过渡关系保持正确", () => {
  const byCode = new Map(regulations.map((record) => [logic.normalizeCode(record.code), record]));
  const old = byCode.get(logic.normalizeCode("YY/T 0954-2015"));
  const next = byCode.get(logic.normalizeCode("YY/T 0954-2026"));
  assert.equal(old?.status, "active", "新版实施前旧版仍应发布为现行");
  assert.equal(old?.effective, "2017-01-01", "使用原强制性标准发布公告日期，不按强转推后的编号倒推");
  assert.match(old?.note ?? "", /2016-01-01.*差异/);
  assert.equal(next?.status, "upcoming");
  assert.equal(next?.effective, "2027-03-01");
  assert.match(next?.note ?? "", /不直接套用于重组胶原蛋白/);
  for (const code of ["YY/T 1805.2-2021", "YY/T 1805.3-2022", "GB/T 38482-2021", "YY/T 1849-2022", "YY/T 1985-2025", "YY/T 1955-2025", "YY/T 1954-2025", "YY/T 1947-2025", "2021年第27号通告", "2017年第224号", "2021年第21号", "2023年第16号"]) {
    assert.equal(byCode.get(logic.normalizeCode(code))?.status, "active", code);
    assert.equal(byCode.get(logic.normalizeCode(code))?.updated, "2026-10-10", code);
  }
  for (const code of ["YY/T 0954-2015", "YY0954-2015"]) {
    const [result] = logic.compareRows([{ "标准号": code, "法规名称": "I型胶原蛋白植入剂" }], regulations);
    assert.equal(result.result, "upcoming", "不能误报已经替代");
    assert.equal(result.referenceCode, "YY/T 0954-2026");
    assert.match(result.note, /将由/);
  }
  for (const code of ["YY/T 1453-2016", "YY/T 1888-2023", "YY/T 1511-2017"]) {
    assert.equal(regulations.filter((record) => logic.normalizeCode(record.code) === logic.normalizeCode(code) && record.status === "active").length, 1, "已有相关标准不重复增加");
  }
});

test("发布时不能残留已到实施日期的即将实施记录", () => {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date());
  const stale = regulations.filter(({ status, effective }) => status === "upcoming" && /^\d{4}-\d{2}-\d{2}$/.test(effective) && effective <= today);
  assert.deepEqual(stale.map(({ code, effective }) => `${code}（${effective}）`), [], "实施日已到：发布前必须重新核验现行状态及旧版替代关系");
  const premature = regulations.filter(({ status, effective }) => status === "active" && /^\d{4}-\d{2}-\d{2}$/.test(effective) && effective > today);
  assert.deepEqual(premature.map(({ code, effective }) => `${code}（${effective}）`), [], "未来实施节点不能误标为已经实施");
  const udi = regulations.find(({ code }) => code === "2026年第21号");
  assert.equal(udi?.status, "upcoming");
  assert.equal(udi?.effective, "2027-06-01");
  assert.match(udi?.note ?? "", /2029-06-01.*继续执行/);
});

test("环氧乙烷2023版实施后网页、导出和比对只以新版为现行依据", () => {
  const newRecord = regulations.find(({ code }) => code === "GB 18279-2023");
  assert.equal(newRecord?.status, "active");
  assert.equal(newRecord?.category, "灭菌");
  assert.equal(newRecord?.effective, "2026-10-01");
  for (const code of ["GB 18279.1-2015", "GB/T 18279.2-2015"]) {
    assert.equal(regulations.find((record) => record.code === code)?.status, "replaced");
    const [comparison] = logic.compareRows([{ "标准号": code, "法规名称": "环氧乙烷灭菌" }], regulations);
    assert.equal(comparison.result, "replace");
    assert.equal(comparison.referenceCode, "GB 18279-2023");
    const [compactComparison] = logic.compareRows([{ "标准号": code.replace(/\s+/g, ""), "法规名称": "环氧乙烷灭菌" }], regulations);
    assert.equal(compactComparison.result, "replace", "有无空格的原始编号都应正确识别替代");
    assert.equal(compactComparison.referenceCode, "GB 18279-2023");
  }
});

test("关键版本替代关系不会把旧版误标为现行", () => {
  const byCode = new Map(regulations.map((record) => [logic.normalizeCode(record.code), record]));
  assert.equal(byCode.has(logic.normalizeCode("JJG 52-1999")), false, "已被2013版替代的JJG 52-1999不应继续留库");
  assert.equal(byCode.has(logic.normalizeCode("YY/T 0467-2016")), false, "已废止的YY/T 0467-2016不应继续留库");
  for (const oldCode of ["YY/T 0567.2-2005", "YY/T 0870.2-2013", "YY/T 0870.3-2013"]) {
    assert.equal(byCode.get(logic.normalizeCode(oldCode))?.status, "replaced", `${oldCode} 已替代，不能作为现行发布`);
  }
  assert.equal(byCode.get(logic.normalizeCode("YY/T 0698.2-2009"))?.status, "replaced");
  assert.equal(byCode.get(logic.normalizeCode("YY/T 0698.2-2022"))?.effective, "2023-10-01");
  assert.equal(byCode.get(logic.normalizeCode("YY/T 0698.5-2009"))?.status, "replaced");
  assert.equal(byCode.get(logic.normalizeCode("YY/T 0698.5-2023"))?.effective, "2024-09-15");
  for (const code of ["YY/T 0698.3-2009", "YY/T 0698.6-2009", "YY/T 0698.7-2009", "YY/T 0698.8-2009"]) {
    assert.equal(byCode.get(logic.normalizeCode(code))?.status, "active", code);
  }
  for (const code of ["YY/T 0698.4-2009", "YY/T 0698.9-2009", "YY/T 0698.10-2009"]) {
    assert.equal(byCode.get(logic.normalizeCode(code))?.status, "active", code);
    assert.equal(byCode.get(logic.normalizeCode(code))?.effective, "2010-12-01", code);
  }
  assert.equal(byCode.get(logic.normalizeCode("YY/T 0471.5-2004"))?.status, "replaced");
  assert.equal(byCode.get(logic.normalizeCode("YY/T 0471.5-2017"))?.effective, "2018-01-01");
  assert.equal(byCode.get(logic.normalizeCode("YY/T 0586-2005"))?.status, "replaced");
  assert.equal(byCode.get(logic.normalizeCode("YY/T 0586-2016"))?.effective, "2017-01-01");
  for (const [code, effective] of [["YY/T 0681.11-2014", "2015-07-01"], ["YY/T 0681.13-2014", "2015-07-01"], ["YY/T 0698.1-2011", "2013-06-01"]]) {
    assert.equal(byCode.get(logic.normalizeCode(code))?.status, "active", code);
    assert.equal(byCode.get(logic.normalizeCode(code))?.effective, effective, code);
  }
  assert.equal(byCode.get(logic.normalizeCode("YY/T 0681.4-2010"))?.status, "replaced");
  assert.equal(byCode.get(logic.normalizeCode("YY/T 0681.4-2021"))?.effective, "2022-04-01");
  for (const code of ["YY/T 0681.2-2010", "YY/T 0681.3-2010", "YY/T 0681.5-2010", "YY/T 0681.6-2011", "YY/T 0681.7-2011", "YY/T 0681.8-2011", "YY/T 0681.9-2011", "YY/T 0681.10-2011"]) {
    assert.equal(byCode.get(logic.normalizeCode(code))?.status, "active", code);
  }
  for (const [code, effective] of [["GB 50591-2010", "2011-02-01"], ["YY/T 1295-2015", "2016-01-01"], ["YY/T 0681.1-2018", "2020-01-01"]]) {
    assert.equal(byCode.get(logic.normalizeCode(code))?.status, "active", code);
    assert.equal(byCode.get(logic.normalizeCode(code))?.effective, effective, code);
  }
  for (const [code, effective] of [["YY/T 1465.7-2021", "2022-04-01"], ["YY/T 1775.1-2021", "2022-04-01"], ["YY/T 1733-2020", "2022-06-01"], ["YY/T 1613-2018", "2019-10-01"]]) {
    assert.equal(byCode.get(logic.normalizeCode(code))?.status, "active", code);
    assert.equal(byCode.get(logic.normalizeCode(code))?.effective, effective, code);
  }
  for (const [code, effective] of [["YY/T 0567.2-2021", "2022-04-01"], ["YY/T 0567.3-2011", "2013-06-01"], ["YY/T 0870.1-2013", "2014-10-01"], ["YY/T 0870.2-2019", "2020-06-01"], ["YY/T 0870.3-2019", "2020-08-01"]]) {
    assert.equal(byCode.get(logic.normalizeCode(code))?.status, "active", code);
    assert.equal(byCode.get(logic.normalizeCode(code))?.effective, effective, code);
  }
  for (const [oldCode, newCode] of Object.entries(logic.replacementMap)) {
    const oldRecord = byCode.get(logic.normalizeCode(oldCode));
    if (oldRecord) assert.notEqual(oldRecord.status, "active", `${oldCode} 不应与 ${newCode} 同时作为现行版本`);
  }
  for (const [oldCode, newCode, oldStatus, newStatus] of [
    ["GB/T 27025-2008", "GB/T 27025-2019", "replaced", "active"],
    ["GB/T 19015-2008", "GB/T 19015-2021", "replaced", "active"],
    ["GB/T 13554-2008", "GB/T 13554-2020", "replaced", "active"],
    ["YY/T 0466.1-2016", "YY/T 0466.1-2023", "replaced", "active"],
    ["GB/T 14233.2-2005", "GB/T 14233.2-2025", "active", "upcoming"],
    ["GB/T 16292-2010", "GB/T 16292-2025", "active", "upcoming"],
    ["GB/T 16293-2010", "GB/T 16293-2025", "active", "upcoming"],
    ["GB/T 16294-2010", "GB/T 16294-2025", "active", "upcoming"],
    ["GB 18280.1-2015", "GB 18280.1-2025", "active", "upcoming"],
    ["GB 18280.2-2015", "GB/T 18280.2-2025", "active", "upcoming"],
  ]) {
    assert.equal(byCode.get(logic.normalizeCode(oldCode))?.status, oldStatus, oldCode);
    assert.equal(byCode.get(logic.normalizeCode(newCode))?.status, newStatus, newCode);
  }
  for (const [code, effective] of [
    ["GB 18278.1-2015", "2017-07-01"], ["GB/T 15981-2021", "2022-07-01"],
    ["GB/T 19335-2022", "2023-05-01"], ["YY/T 1570-2017", "2018-04-01"],
    ["YY/T 1876-2023", "2024-01-15"], ["JJF 1101-2019", "2020-03-27"],
    ["JJG 30-2012", "2012-09-02"],
    ["GB/T 6543-2025", "2025-12-01"],
  ]) {
    assert.equal(byCode.get(logic.normalizeCode(code))?.status, "active", code);
    assert.equal(byCode.get(logic.normalizeCode(code))?.effective, effective, code);
  }
  for (const [code, status, effective] of [
    ["GB/Z 130-2025", "active", "—"],
    ["YY/T 0297-2026", "upcoming", "2027-03-01"],
    ["GB 18280.1-2025", "upcoming", "2029-01-01"],
    ["GB/T 18280.2-2025", "upcoming", "2027-07-01"],
    ["GB/T 18280.3-2025", "upcoming", "2027-07-01"],
    ["GB/T 47143-2026", "upcoming", "2027-08-01"],
    ["GB/T 47144-2026", "upcoming", "2027-08-01"],
  ]) {
    assert.equal(byCode.get(logic.normalizeCode(code))?.status, status, code);
    assert.equal(byCode.get(logic.normalizeCode(code))?.effective, effective, code);
  }
});
