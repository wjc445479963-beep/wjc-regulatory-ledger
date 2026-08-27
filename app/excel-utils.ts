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
