import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

async function loadSource(path) {
  const source = await readFile(resolve(path), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const [{ regulations }, logic, excel] = await Promise.all([
  loadSource("app/regulations-data.ts"), loadSource("lib/regulation-logic.ts"), loadSource("app/excel-utils.ts"),
]);
const addedIds = [
  "imported-compare-066",
  "imported-compare-112",
  "imported-compare-153",
  "cmde-benefit-risk-2023",
  "cmde-usability-2024",
  "imported-compare-135",
  "cmde-animal-study-part2-2021",
  "imported-compare-141",
  "imported-compare-070",
  "imported-compare-071",
  "cmde-known-leachables-2019",
  "imported-compare-131",
  "cmde-nano-part2-2023",
  "imported-compare-184",
  "cmde-nano-part4-2026",
  "imported-compare-190",
  "cmde-priority-review-rules-2025",
  "cmde-innovation-support-2025",
  "cmde-recombinant-injection-2022",
  "imported-compare-extra-004",
  "cmde-clinical-paths-2024",
  "cmde-trial-design-types-2024",
  "cmde-real-world-data-2020",
  "cmde-collagen-cartilage-2025",
  "cmde-acellular-wound-2025",
  "cmde-alginate-dressing-2025",
  "cmde-polyurethane-dressing-2026",
  "cmde-hydrogel-dressing-2024",
  "cmde-dressing-equivalence-2026",
  "cmde-regenerative-hernia-2025",
  "cmde-nerve-repair-2025",
  "cmde-cyanoacrylate-2024",
  "cmde-absorbable-antiadhesion-2024",
  "cmde-absorbable-hemostasis-2024",
  "cmde-ha-wound-dressing-2024"
];
const restoredIds = [
  "imported-compare-066",
  "imported-compare-112",
  "imported-compare-153",
  "imported-compare-135",
  "imported-compare-141",
  "imported-compare-070",
  "imported-compare-071",
  "imported-compare-131",
  "imported-compare-184",
  "imported-compare-190",
  "imported-compare-extra-004"
];

test("器审中心补漏35份独立文件均有正式依据，未重复创建既有候选", () => {
  assert.equal(addedIds.length, 35);
  assert.equal(restoredIds.length, 11);
  for (const id of addedIds) {
    const matches = regulations.filter((record) => record.id === id);
    assert.equal(matches.length, 1, id);
    const record = matches[0];
    assert.equal(record.status, "active", id);
    assert.equal(record.updated, "2026-10-10", id);
    assert.match(record.href, /^https:\/\/www\.(cmde\.org\.cn|nmpa\.gov\.cn)\//);
    assert.match(record.note, /正式发布于\d{4}-\d{2}-\d{2}/);
    assert.doesNotMatch(record.title, /征求意见/);
    assert.equal(record.effective, id === "cmde-innovation-support-2025" ? "2025-03-27" : "—", "公开日不可冒充实施日");
    const [roundTrip] = logic.compareRows([{ 编号: record.code, 法规名称: record.title }], regulations);
    assert.equal(roundTrip.referenceCode, record.code, id);
    assert.equal(roundTrip.result, "active", id);
  }
  assert.equal(regulations.filter(({ status }) => status === "active").length, 263);
  assert.equal(regulations.filter(({ status }) => status === "upcoming").length, 19);
  for (const id of ["cmde-nano-part4-2026", "cmde-recombinant-injection-2022", "cmde-cyanoacrylate-2024"]) {
    assert.equal(regulations.find((record) => record.id === id)?.status, "active");
  }
  assert.equal(regulations.some(({ title }) => /有源植入式医疗器械电池|腹腔内窥镜手术系统.*第5部分/.test(title)), false, "不能因最新发布而扩展至本次范围外产品");
});

test("保留发布机构与附件标识，裸文号不得在多附件间盲目匹配", () => {
  const code = "器审中心2024年第23号通告·附件5";
  assert.equal(logic.extractDocumentCode(code), code);
  assert.equal(logic.extractDocumentCode("国家药监局2021年第91号通告·医疗器械附件"), "国家药监局2021年第91号通告·医疗器械附件");
  const [nano, water, bare, wrongIssuer, wrongAnnex, oldYear, draft] = logic.compareRows([
    { 编号: "2024年第23号", 法规名称: "应用纳米材料的医疗器械安全性和有效性评价指导原则 第三部分：生物相容性毒理学评价" },
    { 编号: "2024年第23号", 法规名称: "水凝胶敷料注册审查指导原则" },
    { 编号: "2024年第23号", 法规名称: "" },
    { 编号: "国家药监局2024年第23号通告", 法规名称: "水凝胶敷料注册审查指导原则" },
    { 编号: "器审中心2024年第23号通告·附件99", 法规名称: "水凝胶敷料注册审查指导原则" },
    { 编号: "器审中心2022年第23号通告", 法规名称: "水凝胶敷料注册审查指导原则" },
    { 编号: "器审中心2026年第23号通告", 法规名称: "α-氰基丙烯酸酯类医用粘合剂注册审查指导原则（2026年修订版）" },
  ], regulations);
  assert.equal(nano.referenceCode, code);
  assert.equal(water.referenceCode, "器审中心2024年第23号通告·附件1");
  assert.equal(bare.result, "recognized");
  assert.match(bare.note, /附件区分/);
  for (const result of [wrongIssuer, wrongAnnex, oldYear, draft]) assert.equal(result.result, "recognized", "错误机构、附件、版本不得继承同名文件的现行状态");
  const twoIssuers = [
    { ...regulations.find(({ id }) => id === "cmde-hydrogel-dressing-2024"), code: "器审中心2024年第23号通告" },
    { ...regulations.find(({ id }) => id === "cn-clinical-evaluation"), code: "国家药监局2024年第23号通告" },
  ];
  assert.equal(logic.compareRows([{ 编号: "2024年第23号", 法规名称: "" }], twoIssuers)[0].result, "recognized");
  const existingDraftName = "水凝胶敷料注册审查指导原则（征求意见稿）";
  assert.equal(logic.compareRows([{ 编号: "器审中心2024年第23号通告·附件1", 法规名称: existingDraftName }], regulations)[0].result, "recognized", "即使填入正式文件文号，草案名称也不能被判为现行");
  assert.equal(logic.compareRows([{ 法规名称: existingDraftName }], regulations)[0].result, "named");
});

test("全库公开文件均能按导出编号回读，过渡期保留即将替代提示", () => {
  const published = regulations.filter(({ status }) => status === "active" || status === "upcoming");
  for (const record of published) {
    const [result] = logic.compareRows([{ 编号: record.code, 法规名称: record.title }], published);
    const transition = Object.entries(logic.upcomingMap).find(([code]) => logic.normalizeCode(code) === logic.normalizeCode(record.code));
    assert.equal(result.referenceCode, transition ? published.find(({ code }) => logic.normalizeCode(code) === logic.normalizeCode(transition[1])).code : record.code, record.code);
    assert.equal(result.result, transition ? "upcoming" : record.status, record.code);
  }
  assert.equal(logic.extractStandardCode("ISO 11607-1 2019"), "ISO 11607-1 2019");
  assert.equal(logic.extractDocumentCode("国家药监局、国家卫生健康委令第1号"), "国家药监局、国家卫生健康委令第1号");
});

test("临床评价5项配套文件可检索、按原文号或名称比对，并各有官方入口", () => {
  const clinical = regulations.find(({ id }) => id === "cn-clinical-evaluation");
  assert.equal(clinical.code, "2021年第73号通告");
  assert.equal(clinical.effective, "—");
  assert.equal(clinical.relatedDocuments.length, 5);
  for (const document of clinical.relatedDocuments) {
    assert.ok(logic.regulationSearchText(clinical).includes(document.title.toLowerCase()));
    assert.ok(clinical.note.includes(document.title), "原Excel说明列须保留配套文件名称");
    for (const row of [{ 编号: clinical.code, 法规名称: document.title }, { 法规名称: document.title }]) {
      const [result] = logic.compareRows([row], regulations);
      assert.equal(result.result, "active", document.title);
      assert.equal(result.referenceCode, clinical.code);
      assert.equal(result.referenceTitle, document.title);
      assert.equal(result.href, document.href);
    }
  }
  for (const id of ["cn-ha-injection-review-2026-5", "cn-ha-clinical-trial-2019-13"]) {
    assert.match(regulations.find((record) => record.id === id).href, /^https:\/\/www\.cmde\.org\.cn\//);
  }
});

// 使用真实导出函数并在内存读取其ZIP/XML，避免仅检查源文件字符串而漏掉导出不同步。
function unzipStored(bytes) {
  const result = new Map();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  for (let offset = 0; offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50;) {
    assert.equal(view.getUint16(offset + 8, true), 0, "导出ZIP使用无压缩条目");
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const start = offset + 30 + nameLength + extraLength;
    result.set(decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength)), decoder.decode(bytes.subarray(start, start + size)));
    offset = start + size;
  }
  return result;
}
function xmlRows(xml) {
  const decode = (value) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  return [...xml.matchAll(/<row\b[^>]*>(.*?)<\/row>/gs)].map((row) => [...row[1].matchAll(/<t\b[^>]*>(.*?)<\/t>/gs)].map((cell) => decode(cell[1])));
}
test("实际Excel导出与网页共用282条数据及核验日期，不混入历史和空白工作表", async () => {
  const previousDocument = globalThis.document;
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  let blob;
  try {
    globalThis.document = { createElement: () => ({ click() {} }) };
    URL.createObjectURL = (value) => { blob = value; return "blob:test"; };
    URL.revokeObjectURL = () => {};
    const sorted = [...regulations].sort(logic.compareRegulations);
    excel.downloadRegulationsWorkbook("法规主库.xlsx", sorted);
    const entries = unzipStored(new Uint8Array(await blob.arrayBuffer()));
    const workbook = entries.get("xl/workbook.xml");
    const sheetNames = [...workbook.matchAll(/<sheet name="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(sheetNames, ["现行法规", "即将实施", "CFDA法律法规", "YY", "GB", "ISO"]);
    const actual = sheetNames.map((_, index) => xmlRows(entries.get(`xl/worksheets/sheet${index + 1}.xml`)));
    assert.equal(actual[0].length - 1, 263);
    assert.equal(actual[1].length - 1, 19);
    const rowFor = (record) => [record.code, record.title, record.category, record.status === "active" ? "现行" : "即将实施", record.effective, record.source, record.updated, record.note, record.href];
    assert.deepEqual(actual[0].slice(1), sorted.filter(({ status }) => status === "active").map(rowFor));
    assert.deepEqual(actual[1].slice(1), sorted.filter(({ status }) => status === "upcoming").map(rowFor));
    assert.ok(actual.every((rows) => rows.length > 1));
    const byCode = new Map(actual[0].slice(1).map((row) => [row[0], row]));
    for (const id of addedIds) assert.equal(byCode.get(regulations.find((record) => record.id === id).code)?.[6], "2026-10-10");
    const clinical = regulations.find(({ id }) => id === "cn-clinical-evaluation");
    for (const document of clinical.relatedDocuments) assert.ok(byCode.get(clinical.code)[7].includes(document.title));
  } finally {
    globalThis.document = previousDocument;
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
  }
});

