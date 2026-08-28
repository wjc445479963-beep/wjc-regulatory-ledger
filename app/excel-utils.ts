export type SpreadsheetRow = Record<string, string>;

function text(value: unknown) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function decodeDelimitedText(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const decode = (encoding: string, fatal = false) => {
    try {
      return new TextDecoder(encoding, { fatal }).decode(bytes).replace(/^\uFEFF/, "");
    } catch {
      return "";
    }
  };
  const utf8 = decode("utf-8", true);
  if (utf8) return utf8;
  const gb18030 = decode("gb18030");
  if (gb18030) return gb18030;
  return decode("utf-8");
}

function uniqueHeaders(values: string[]) {
  const seen = new Map<string, number>();
  return values.map((value, index) => {
    const base = text(value) || `列${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count ? `${base}_${count + 1}` : base;
  });
}

function rowsFromMatrix(matrix: string[][]) {
  const nonEmpty = matrix.filter((row) => row.some((cell) => text(cell)));
  if (!nonEmpty.length) return [];
  const headerTerms = ["标准", "法规", "文件", "名称", "编号", "版本", "代号", "code", "title", "standard"];
  let headerIndex = 0;
  let bestScore = -1;
  nonEmpty.slice(0, 12).forEach((row, index) => {
    const score = row.reduce((total, cell) => total + (headerTerms.some((term) => text(cell).toLowerCase().includes(term.toLowerCase())) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      headerIndex = index;
    }
  });
  const headers = uniqueHeaders(nonEmpty[headerIndex]);
  return nonEmpty.slice(headerIndex + 1).map((row) => Object.fromEntries(headers.map((header, index) => [header, text(row[index])]))).filter((row) => Object.values(row).some(Boolean));
}

function parseDelimited(raw: string): SpreadsheetRow[] {
  const input = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const sample = input.split("\n").slice(0, 5).join("\n");
  const delimiter = (sample.match(/\t/g) ?? []).length > (sample.match(/,/g) ?? []).length ? "\t" : ",";
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" && !quoted) {
      row.push(cell);
      matrix.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    matrix.push(row);
  }
  return rowsFromMatrix(matrix);
}

function u16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes: Uint8Array, offset: number) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

async function inflate(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") throw new Error("当前浏览器不支持本地解析 xlsx，请另存为 CSV 后再上传。");
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let end = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index -= 1) {
    if (u32(bytes, index) === 0x06054b50) {
      end = index;
      break;
    }
  }
  if (end < 0) throw new Error("无法读取该 xlsx 文件。");
  const directorySize = u32(bytes, end + 12);
  const directoryOffset = u32(bytes, end + 16);
  const entries = new Map<string, Uint8Array>();
  let cursor = directoryOffset;
  const decoder = new TextDecoder();
  while (cursor < directoryOffset + directorySize) {
    if (u32(bytes, cursor) !== 0x02014b50) break;
    const compression = u16(bytes, cursor + 10);
    const compressedSize = u32(bytes, cursor + 20);
    const nameLength = u16(bytes, cursor + 28);
    const extraLength = u16(bytes, cursor + 30);
    const commentLength = u16(bytes, cursor + 32);
    const localOffset = u32(bytes, cursor + 42);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = u16(bytes, localOffset + 26);
    const localExtraLength = u16(bytes, localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(start, start + compressedSize);
    entries.set(name, compression === 0 ? compressed : await inflate(compressed));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function columnIndex(reference: string) {
  const letters = reference.replace(/\d/g, "");
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function xmlText(element: Element) {
  return Array.from(element.getElementsByTagName("t")).map((node) => node.textContent ?? "").join("");
}

async function parseXlsx(buffer: ArrayBuffer) {
  const files = await unzip(buffer);
  const decoder = new TextDecoder("utf-8");
  const shared = files.get("xl/sharedStrings.xml");
  const sharedStrings = shared ? Array.from(new DOMParser().parseFromString(decoder.decode(shared), "application/xml").getElementsByTagName("si")).map(xmlText) : [];
  const sheetName = [...files.keys()].filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort()[0];
  if (!sheetName) throw new Error("该 xlsx 文件中没有可读取的工作表。");
  const document = new DOMParser().parseFromString(decoder.decode(files.get(sheetName)!), "application/xml");
  const matrix = Array.from(document.getElementsByTagName("row")).map((row) => {
    const cells: string[] = [];
    Array.from(row.getElementsByTagName("c")).forEach((cell) => {
      const reference = cell.getAttribute("r") ?? "";
      const index = columnIndex(reference);
      const type = cell.getAttribute("t");
      const inline = cell.getElementsByTagName("is")[0];
      const value = inline ? xmlText(inline) : cell.getElementsByTagName("v")[0]?.textContent ?? "";
      cells[index] = type === "s" ? (sharedStrings[Number(value)] ?? value) : type === "b" ? (value === "1" ? "是" : "否") : value;
    });
    return cells.map((cell) => cell ?? "");
  });
  return rowsFromMatrix(matrix);
}

export async function readSpreadsheet(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".tsv")) {
    return { rows: parseDelimited(decodeDelimitedText(await file.arrayBuffer())), sourceType: "CSV/GBK" };
  }
  if (name.endsWith(".xlsx")) {
    return { rows: await parseXlsx(await file.arrayBuffer()), sourceType: "XLSX" };
  }
  throw new Error("暂支持 .xlsx、.csv 或 .tsv；旧版 .xls 请先另存为 .xlsx。");
}

export function downloadCsv(filename: string, rows: SpreadsheetRow[]) {
  if (!rows.length) return;
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = `\uFEFF${[headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))].map((row) => row.map(escape).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type RegulationExportRecord = {
  code: string;
  title: string;
  source: string;
  category: string;
  status: string;
  effective: string;
  updated: string;
  note: string;
  href: string;
};

const exportHeaders = ["编号", "法规名称", "分类", "状态", "生效/关注日期", "来源机构", "最后核对", "说明", "官方来源链接"];
const exportSheets = ["现行法规", "即将实施", "待核对", "CFDA法律法规", "YY", "GB", "ISO", "ASTM", "美国医疗器械法规", "欧盟医疗器械法规"];

function exportStatusLabel(status: string) {
  return status === "active" ? "现行" : status === "upcoming" ? "即将实施" : status === "replaced" ? "已被替代" : "待核对";
}

function exportCategory(record: RegulationExportRecord) {
  const code = record.code.toUpperCase().replace(/\s+/g, "");
  if (/^YY\/?T/.test(code)) return "YY";
  if (/^GB/.test(code)) return "GB";
  if (/^(ISO|IEC|ENISO)/.test(code)) return "ISO";
  if (/^ASTM/.test(code)) return "ASTM";
  if (/^(21CFR|FDA|US)/.test(code) || /美国|FDA/i.test(record.title)) return "美国医疗器械法规";
  if (/(EU|MDR|IVDR|欧盟)/.test(code) || /欧盟|MDR|IVDR/i.test(record.title)) return "欧盟医疗器械法规";
  return "CFDA法律法规";
}

function xmlEscape(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let value = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - 1) / 26);
  }
  return value;
}

function worksheetXml(rows: string[][]) {
  const data = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => "<c r=\"" + columnName(columnIndex) + (rowIndex + 1) + "\"" + (rowIndex === 0 ? " s=\"1\"" : "") + " t=\"inlineStr\"><is><t xml:space=\"preserve\">" + xmlEscape(value) + "</t></is></c>").join("");
    return "<row r=\"" + (rowIndex + 1) + "\">" + cells + "</row>";
  }).join("");
  return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetViews><sheetView workbookViewId=\"0\"><pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight=\"18\"/><cols><col min=\"1\" max=\"1\" width=\"22\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"48\" customWidth=\"1\"/><col min=\"3\" max=\"3\" width=\"22\" customWidth=\"1\"/><col min=\"4\" max=\"9\" width=\"24\" customWidth=\"1\"/></cols><sheetData>" + data + "</sheetData><autoFilter ref=\"A1:I" + rows.length + "\"/></worksheet>";
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(entries: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = encoder.encode(entry.content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(26, name.length, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, localOffset, true);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.length;
  }
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const localSize = localParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localSize, true);
  return new Blob([...localParts, ...centralParts, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadRegulationsWorkbook(filename: string, records: RegulationExportRecord[]) {
  const currentRecords = records.filter((record) => record.status === "active");
  const upcomingRecords = records.filter((record) => record.status === "upcoming");
  const reviewRecords = records.filter((record) => record.status === "review");
  const rowsFor = (items: RegulationExportRecord[]) => [
    exportHeaders,
    ...items.map((item) => [item.code, item.title, item.category, exportStatusLabel(item.status), item.effective, item.source, item.updated, item.note, item.href]),
  ];
  const sheets = exportSheets.map((sheetName) => ({
    name: sheetName,
    rows: rowsFor(sheetName === "现行法规" ? currentRecords : sheetName === "即将实施" ? upcomingRecords : sheetName === "待核对" ? reviewRecords : currentRecords.filter((record) => exportCategory(record) === sheetName)),
  }));
  const sheetEntries = sheets.map((sheet, index) => "<Override PartName=\"/xl/worksheets/sheet" + (index + 1) + ".xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>").join("");
  const sheetRelationships = sheets.map((_, index) => "<Relationship Id=\"rId" + (index + 1) + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet" + (index + 1) + ".xml\"/>").join("");
  const workbookSheets = sheets.map((sheet, index) => "<sheet name=\"" + xmlEscape(sheet.name) + "\" sheetId=\"" + (index + 1) + "\" r:id=\"rId" + (index + 1) + "\"/>").join("");
  const entries = [
    { name: "[Content_Types].xml", content: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>" + sheetEntries + "</Types>" },
    { name: "_rels/.rels", content: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>" },
    { name: "xl/workbook.xml", content: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><bookViews><workbookView/></bookViews><sheets>" + workbookSheets + "</sheets></workbook>" },
    { name: "xl/_rels/workbook.xml.rels", content: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" + sheetRelationships + "<Relationship Id=\"rId" + (sheets.length + 1) + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>" },
    { name: "xl/styles.xml", content: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Aptos\"/></font><font><b/><sz val=\"11\"/><name val=\"Aptos\"/></font></fonts><fills count=\"2\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill></fills><borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs><cellXfs count=\"2\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/><xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"0\" applyFont=\"1\"/></cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>" },
    ...sheets.map((sheet, index) => ({ name: "xl/worksheets/sheet" + (index + 1) + ".xml", content: worksheetXml(sheet.rows) })),
  ];
  const url = URL.createObjectURL(zipStore(entries));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
