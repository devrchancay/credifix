import { extractText as extractPDFText } from "unpdf";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 50_000; // ~50k chars to avoid token overflows

export type ProcessedFile = {
  name: string;
  mimeType: string;
  kind: "text";
  content: string;
};

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/csv",
  "application/csv",
]);

/** Magic byte signatures for supported file types */
const MAGIC_BYTES: Array<{ bytes: number[]; mime: string }> = [
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: "application/pdf" }, // %PDF
  { bytes: [0x50, 0x4b, 0x03, 0x04], mime: "application/zip" }, // PK (DOCX/XLSX are ZIP)
  { bytes: [0xd0, 0xcf, 0x11, 0xe0], mime: "application/msword" }, // OLE2 (DOC/XLS)
];

function detectMimeByMagicBytes(buffer: Buffer): string | null {
  for (const sig of MAGIC_BYTES) {
    if (sig.bytes.every((b, i) => buffer[i] === b)) {
      return sig.mime;
    }
  }
  return null;
}

function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return (
    text.slice(0, MAX_TEXT_LENGTH) +
    "\n\n[... content truncated due to length ...]"
  );
}

async function extractPDF(buffer: Buffer): Promise<string> {
  const { text } = await extractPDFText(new Uint8Array(buffer));
  return text.join("\n");
}

async function extractDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractXLSX(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`--- Sheet: ${sheetName} ---\n${csv}`);
  }

  return sheets.join("\n\n");
}

function extractCSV(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

function extractText(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

function getMimeType(fileName: string, providedMime?: string): string {
  if (providedMime && providedMime !== "application/octet-stream") {
    return providedMime;
  }

  const ext = fileName.toLowerCase().split(".").pop();
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    txt: "text/plain",
  };

  return mimeMap[ext || ""] || "application/octet-stream";
}

export async function processFile(
  buffer: Buffer,
  fileName: string,
  providedMimeType?: string
): Promise<ProcessedFile> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `File "${fileName}" exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }

  const extensionMime = getMimeType(fileName, providedMimeType);
  const detectedMime = detectMimeByMagicBytes(buffer);

  // For binary formats, verify magic bytes match the claimed type
  const binaryMimes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/msword",
  ];
  if (binaryMimes.includes(extensionMime) && detectedMime) {
    // PDF must match PDF signature; DOCX/XLSX must match ZIP signature; DOC/XLS must match OLE2
    const expectedMagic =
      extensionMime === "application/pdf" ? "application/pdf"
      : extensionMime === "application/msword" || extensionMime === "application/vnd.ms-excel" ? "application/msword"
      : "application/zip";
    if (detectedMime !== expectedMagic) {
      throw new Error(`File "${fileName}" content does not match its extension`);
    }
  }

  const mimeType = extensionMime;
  let content: string;

  if (
    mimeType === "application/pdf"
  ) {
    content = await extractPDF(buffer);
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    content = await extractDOCX(buffer);
  } else if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    content = extractXLSX(buffer);
  } else if (mimeType === "text/csv" || mimeType === "application/csv") {
    content = extractCSV(buffer);
  } else if (TEXT_MIME_TYPES.has(mimeType) || mimeType === "text/plain") {
    content = extractText(buffer);
  } else {
    // Attempt plain text extraction as fallback
    content = buffer.toString("utf-8");
  }

  return {
    name: fileName,
    mimeType,
    kind: "text",
    content: truncateText(content.trim()),
  };
}

export { MAX_FILE_SIZE };
