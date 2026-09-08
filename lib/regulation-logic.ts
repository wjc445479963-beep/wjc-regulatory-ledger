export type RegulationLike = {
  code: string;
  title: string;
  category: string;
  source: string;
  status: "active" | "upcoming" | "replaced" | "review";
  effective: string;
  updated: string;
  note: string;
  href: string;
};

export type SpreadsheetRow = Record<string, string>;
export type CompareStatus = "replace" | "upcoming" | "active" | "named" | "recognized" | "unmatched";

export type ComparisonRow = {
  originalCode: string;
  originalTitle: string;
  result: CompareStatus;
  referenceCode: string;
  referenceTitle: string;
  effective: string;
  source: string;
  note: string;
  href: string;
};

export const categoryOrder = [
  "法规·监管基础", "法规·注册管理", "法规·分类命名", "法规·质量体系", "法规·生产管理", "法规·生产经营",
  "法规·经营管理", "法规·标签说明书", "法规·临床评价", "法规·药械组合产品", "法规·上市后", "法规·检验管理",
  "法规·行政管理", "法规·专项指导原则", "质量体系", "风险管理", "生物学评价", "微生物与内毒素", "灭菌",
  "灭菌设备", "洁净环境", "检验方法", "通用检验", "包装", "材料表征", "材料与产品标准", "无源植入物",
  "动物源材料", "药品与检验参考", "国家标准", "医疗器械标准", "国际指南", "国际标准", "GB", "YY", "ISO",
  "CFDA法律法规", "法规文件", "国际标准·动物源", "有源器械·独立参考",
];

export const categoryRank = new Map(categoryOrder.map((category, index) => [category, index]));
const statusRank: Record<RegulationLike["status"], number> = { active: 0, upcoming: 1, replaced: 2, review: 3 };

export function compareRegulations(a: RegulationLike, b: RegulationLike) {
  const categoryDifference = (categoryRank.get(a.category) ?? categoryOrder.length) - (categoryRank.get(b.category) ?? categoryOrder.length);
  if (categoryDifference) return categoryDifference;
  const statusDifference = statusRank[a.status] - statusRank[b.status];
  if (statusDifference) return statusDifference;
  const dateA = /^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(a.effective) ? a.effective : "9999-99-99";
  const dateB = /^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(b.effective) ? b.effective : "9999-99-99";
  return dateA.localeCompare(dateB) || a.code.localeCompare(b.code, "zh-CN", { numeric: true }) || a.title.localeCompare(b.title, "zh-CN");
}

export const replacementMap: Record<string, string> = {
  "GB/T16886.1-2011": "GB/T16886.1-2022", "GB/T16886.3-2008": "GB/T16886.3-2019", "GB/T16886.6-2015": "GB/T16886.6-2022",
  "GB/T16886.9-2017": "GB/T16886.9-2022", "GB/T16886.10-2017": "GB/T16886.10-2024", "GB/T16886.12-2017": "GB/T16886.12-2023",
  "GB/T16886.17-2005": "GB/T16886.17-2025", "GB/T19633.1-2015": "GB/T19633.1-2024", "GB/T19633.2-2015": "GB/T19633.2-2024",
  "GB/T19973.2-2018": "GB/T19973.2-2025", "GB50457-2008": "GB50457-2019", "GB/T1.1-2009": "GB/T1.1-2020",
  "GB/T27025-2008": "GB/T27025-2019", "GB/T19015-2008": "GB/T19015-2021", "GB/T13554-2008": "GB/T13554-2020",
  "GB50243-2002": "GB50243-2016", "YY/T0466.1-2016": "YY/T0466.1-2023", "YY/T0771.2-2009": "GB/T44353.2-2024",
  "ISO11607-2:2006": "ISO11607-2:2019", "2014年第9号通告": "2022年第8号通告", "2017年第75号": "2022年第12号通告",
  "2021年第60号": "2026年第53号公告", "2014年第12号": "2025年第19号公告", "2014年第13号": "2025年第19号公告",
  "2014年第14号": "2025年第19号公告", "2016年第133号": "2025年第19号公告", "2017年第170号": "2025年第19号公告",
  "2018年第94号": "2025年第19号公告", "2020年第61号": "2025年第19号公告", "2021年第71号": "2025年第19号公告",
  "2023年第33号": "2025年第19号公告",
};

export const upcomingMap: Record<string, string> = {
  "GB/T16886.2-2011": "GB/T16886.2-2026", "GB/T14233.2-2005": "GB/T14233.2-2025", "GB/T16292-2010": "GB/T16292-2025",
  "GB/T16293-2010": "GB/T16293-2025", "GB/T16294-2010": "GB/T16294-2025",
};

export function normalizeCode(value: string) {
  let code = String(value ?? "").toUpperCase().trim()
    .replace(/[（()）【】\[\]，,]/g, "").replace(/[：]/g, ":")
    .replace(/[—–−－﹣]/g, "-").replace(/[／∕⁄]/g, "/");
  code = code.replace(/^EN\s*(ISO|IEC)\s*/i, "$1");
  const isoWithYear = code.match(/^(ISO|IEC)\s*(\d+(?:[-.]\d+)*)\s*(?::\s*|\s+|-)(\d{4})$/i);
  if (isoWithYear) code = `${isoWithYear[1]}${isoWithYear[2]}:${isoWithYear[3]}`;
  code = code.replace(/^(GB)\s*[-/]?\s*T(?=\s*\d)/i, "$1/T")
    .replace(/^(YY)\s*[-/]?\s*T(?=\s*\d)/i, "$1/T")
    .replace(/^(GB)\s*[-/]?\s*Z(?=\s*\d)/i, "$1/Z")
    .replace(/^(GB|YY)\s+(?=\d)/i, "$1/T");
  code = code.replace(/\s+/g, "").replace(/^(GBT|GB-T)(?=\d)/, "GB/T").replace(/^(YYT|YY-T)(?=\d)/, "YY/T");
  code = code.replace(/^(ISO|IEC)(\d+(?:[-.]\d+)*)-(\d{4})$/, "$1$2:$3");
  return code;
}

const standardCodePattern = /(?:EN\s*)?(?:GB\s*\/?\s*[TZ]?|YY\s*\/?\s*T?|ISO|IEC|ASTM|GHTF|JJF|JJG)\s*[-A-Z0-9./:~～]+/i;
export function extractStandardCode(value: string) {
  const normalizedText = String(value ?? "").replace(/[／∕⁄]/g, "/").replace(/[：]/g, ":").replace(/[—–−－﹣]/g, "-");
  return normalizedText.match(standardCodePattern)?.[0]?.trim() ?? "";
}

const documentCodePattern = /(?:[\u4e00-\u9fa5]{2,30}令第\s*\d+\s*号|[\u4e00-\u9fa5]{2,30}[〔\[【]\s*\d{4}\s*[〕\]】]\s*\d+\s*号|(?:国)?食药监[\u4e00-\u9fa5]{0,8}[\[【〔]?\s*\d{4}\s*[\]】〕]?\s*\d+\s*号|[\u4e00-\u9fa5]{2,30}(?:公告|通知|通告)\s*\d{4}\s*年第\s*\d+\s*号|\d{4}\s*年第\s*\d+\s*号(?:公告|通知|通告)?)/i;
export function extractDocumentCode(value: string) { return String(value ?? "").match(documentCodePattern)?.[0]?.replace(/\s+/g, "").trim() ?? ""; }

function normalizeHeader(value: string) { return value.toLowerCase().replace(/[\s_]/g, ""); }
function getRowValue(row: SpreadsheetRow, terms: string[]) {
  const exact = Object.entries(row).find(([key]) => terms.some((term) => normalizeHeader(key) === normalizeHeader(term)));
  const found = exact ?? Object.entries(row).find(([key]) => terms.some((term) => normalizeHeader(key).includes(normalizeHeader(term))));
  return found?.[1]?.trim() ?? "";
}
export function findCode(row: SpreadsheetRow) {
  const labeled = getRowValue(row, ["标准号", "标准编号", "法规编号", "文件编号", "文件号", "标准代号", "编号", "代号", "code", "standard"]);
  return extractStandardCode(labeled) || extractDocumentCode(labeled) || Object.values(row).map(extractStandardCode).find(Boolean) || Object.values(row).map(extractDocumentCode).find(Boolean) || "";
}
export function findTitle(row: SpreadsheetRow) { return getRowValue(row, ["文件名称", "法规名称", "标准名称", "文件名", "名称", "标题", "title"]) || Object.values(row).filter(Boolean).sort((a, b) => b.length - a.length)[0] || "未填写名称"; }
function normalizeTitle(value: string) { return String(value ?? "").toLowerCase().replace(/[\s、，。；：:（）()《》“”‘’'「」『』—–-]/g, ""); }
function sourceForCode(code: string) {
  const normalized = normalizeCode(code);
  if (/令第|公告|通知|通告|〔/.test(code)) return { source: "国家药品监督管理局法规文件", href: "https://www.nmpa.gov.cn/directory/web/nmpa/ylqx/ylqxfgwj/index.html" };
  if (/^(GB\/T|GB\/Z|GB)/.test(normalized)) return { source: "国家标准全文公开平台", href: `https://openstd.samr.gov.cn/bzgk/std/std_list?p.p1=0&p.p2=${encodeURIComponent(code)}&p.p90=circulation_date&p.p91=desc` };
  if (/^(YY\/T|YY)/.test(normalized)) return { source: "国家药品监督管理局医疗器械标准公告", href: "https://www.nmpa.gov.cn/xxgk/ggtg/ylqxggtg/ylqxhybzhgg/index.html" };
  if (/^(ISO|IEC)/.test(normalized)) return { source: "国际标准化组织（ISO）", href: `https://www.iso.org/search.html?q=${encodeURIComponent(code)}` };
  if (/^ASTM/.test(normalized)) return { source: "ASTM官方标准检索", href: `https://www.astm.org/search.html#q=${encodeURIComponent(code)}` };
  return { source: "国家药品监督管理局公开信息", href: "https://www.nmpa.gov.cn/ylqx/" };
}
function sourceForTitle(title: string) {
  const normalized = normalizeTitle(title);
  if (normalized.includes("药典")) return { source: "国家药典委员会药典数据库", href: "https://ydz.chp.org.cn/" };
  if (/(国务院|条例|办法|许可证|规范|指南|通知|公告|通告|令)/.test(normalized)) return { source: "国家药品监督管理局法规文件", href: "https://www.nmpa.gov.cn/directory/web/nmpa/ylqx/ylqxfgwj/index.html" };
  return { source: "国家药品监督管理局公开信息", href: "https://www.nmpa.gov.cn/ylqx/" };
}

function mappedCode(code: string, map: Record<string, string>) {
  const entry = Object.entries(map).find(([key]) => normalizeCode(key) === code);
  return entry ? normalizeCode(entry[1]) : "";
}

export function compareRows(rows: SpreadsheetRow[], sourceRegulations: RegulationLike[]) {
  return rows.map((row): ComparisonRow => {
    const originalCode = findCode(row);
    const originalTitle = findTitle(row);
    const normalized = normalizeCode(originalCode);
    const replacementCode = mappedCode(normalized, replacementMap);
    const upcomingCode = mappedCode(normalized, upcomingMap);
    const direct = normalized ? sourceRegulations.find((item) => normalizeCode(item.code) === normalized) : undefined;
    const byTitle = !originalCode ? sourceRegulations.find((item) => {
      const inputTitle = normalizeTitle(originalTitle); const referenceTitle = normalizeTitle(item.title);
      return inputTitle.length >= 8 && referenceTitle.length >= 8 && (inputTitle === referenceTitle || inputTitle.includes(referenceTitle) || referenceTitle.includes(inputTitle));
    }) : undefined;
    const replacementReference = replacementCode ? sourceRegulations.find((item) => normalizeCode(item.code) === replacementCode) : undefined;
    const upcomingReference = upcomingCode ? sourceRegulations.find((item) => normalizeCode(item.code) === upcomingCode) : undefined;
    const reference = replacementReference || upcomingReference || direct || byTitle;
    if (reference) {
      const result: CompareStatus = replacementReference ? "replace" : upcomingReference || reference.status === "upcoming" ? "upcoming" : reference.status === "active" ? "active" : "recognized";
      return { originalCode, originalTitle, result, referenceCode: reference.code, referenceTitle: reference.title, effective: reference.effective, source: reference.source, note: replacementReference ? `${originalCode} 已由 ${reference.code} 替代。` : upcomingReference ? `${originalCode} 将由 ${reference.code} 替代，实施日期为 ${reference.effective}。` : reference.note, href: reference.href };
    }
    if (originalCode) { const source = sourceForCode(originalCode); return { originalCode, originalTitle, result: "recognized", referenceCode: originalCode, referenceTitle: originalTitle, effective: "—", source: source.source, note: "已识别文件编号，但该文件尚未纳入最新法规主库；系统不会臆测其现行状态。", href: source.href }; }
    if (originalTitle !== "未填写名称") { const source = sourceForTitle(originalTitle); return { originalCode, originalTitle, result: "named", referenceCode: "按名称识别", referenceTitle: originalTitle, effective: "—", source: source.source, note: "未提供编号，只能按名称给出候选结果；请人工确认后再纳入受控清单。", href: source.href }; }
    return { originalCode, originalTitle, result: "unmatched", referenceCode: "—", referenceTitle: "未识别文件", effective: "—", source: "—", note: "这一行没有可用的编号或文件名称。", href: "" };
  });
}

export function validateComparisonInput(rows: SpreadsheetRow[]) {
  const headers = Object.keys(rows[0] ?? {}).map(normalizeHeader);
  if (headers.some((header) => ["比对结果", "参考标准号", "官方参考"].some((term) => header.includes(normalizeHeader(term))))) throw new Error("检测到这是比对结果文件，请上传原始文控清单或先下载标准模板填写。");
  if (!headers.some((header) => ["标准号", "标准编号", "法规编号", "文件编号", "文件号", "standardno.", "standardno", "standardnumber", "code"].includes(header)) && !headers.some((header) => ["法规名称", "标准名称", "文件名称", "文件名", "名称", "标题", "regulationtitle", "standardtitle", "title"].includes(header))) throw new Error("请使用标准模板上传：至少包含“标准号”或“法规名称”列。没有编号的文件可以只填写名称。");
  if (!headers.some((header) => ["法规名称", "标准名称", "文件名称", "文件名", "名称", "标题", "regulationtitle", "standardtitle", "title"].includes(header))) throw new Error("请使用标准模板上传：必须包含“法规名称”列。没有编号的文件也请填写文件名称。");
}
