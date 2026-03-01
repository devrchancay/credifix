export const KNOWLEDGE_TEMP_BUCKET = "knowledge-temp";

export function getStoragePath(agentId: string, filename: string): string {
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${agentId}/${timestamp}-${safeName}`;
}
