import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 50_000; // ~50k chars to avoid token overflows

export type ProcessedFile = {
  name: string;
  mimeType: string;
} & (
  | { kind: "text"; content: string }
  | { kind: "image"; base64: string; mediaType: string }
);

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/csv",
  "application/csv",
]);

const IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return (
    text.slice(0, MAX_TEXT_LENGTH) +
    "\n\n[... content truncated due to length ...]"
  );
}

async function extractPDF(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  await parser.load();
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
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
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
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

  const mimeType = getMimeType(fileName, providedMimeType);

  // Images → base64 for vision
  if (IMAGE_MIME_TYPES.has(mimeType)) {
    const base64 = buffer.toString("base64");
    return {
      name: fileName,
      mimeType,
      kind: "image",
      base64,
      mediaType: mimeType,
    };
  }

  // Text extraction based on type
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
