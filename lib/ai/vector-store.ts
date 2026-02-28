import { openaiClient } from "./config";

export interface VectorStoreFile {
  id: string;
  filename: string;
  fileSize: number;
  status: "processing" | "completed" | "failed";
  createdAt: number;
}

export async function createVectorStore(name: string): Promise<string> {
  const vectorStore = await openaiClient.vectorStores.create({ name });
  return vectorStore.id;
}

function mapOpenAIStatus(
  status: string
): "processing" | "completed" | "failed" {
  if (status === "completed") return "completed";
  if (status === "failed" || status === "cancelled") return "failed";
  return "processing";
}

export async function listFilesWithDetails(
  vectorStoreId: string
): Promise<VectorStoreFile[]> {
  const vsFiles = await openaiClient.vectorStores.files.list(vectorStoreId);

  const files = await Promise.all(
    vsFiles.data.map(async (vsFile) => {
      const fileDetail = await openaiClient.files.retrieve(vsFile.id);
      return {
        id: vsFile.id,
        filename: fileDetail.filename,
        fileSize: fileDetail.bytes,
        status: mapOpenAIStatus(vsFile.status),
        createdAt: vsFile.created_at,
      };
    })
  );

  return files.sort((a, b) => b.createdAt - a.createdAt);
}

export async function uploadFile(
  vectorStoreId: string,
  file: File
): Promise<{ fileId: string; status: string }> {
  // Upload file to OpenAI
  const openaiFile = await openaiClient.files.create({
    file,
    purpose: "assistants",
  });

  // Attach to vector store
  const vsFile = await openaiClient.vectorStores.files.create(vectorStoreId, {
    file_id: openaiFile.id,
  });

  return {
    fileId: openaiFile.id,
    status: vsFile.status,
  };
}

export async function listFiles(vectorStoreId: string) {
  const files = await openaiClient.vectorStores.files.list(vectorStoreId);
  return files.data;
}

export async function deleteFile(
  vectorStoreId: string,
  fileId: string
): Promise<void> {
  // Remove from vector store
  await openaiClient.vectorStores.files.delete(fileId, {
    vector_store_id: vectorStoreId,
  });
  // Delete the file from OpenAI
  await openaiClient.files.delete(fileId);
}

export async function getFileStatus(
  vectorStoreId: string,
  fileId: string
): Promise<string> {
  const file = await openaiClient.vectorStores.files.retrieve(fileId, {
    vector_store_id: vectorStoreId,
  });
  return file.status;
}

export async function deleteVectorStore(
  vectorStoreId: string
): Promise<void> {
  await openaiClient.vectorStores.delete(vectorStoreId);
}
