import { openaiClient } from "./config";

export async function createVectorStore(name: string): Promise<string> {
  const vectorStore = await openaiClient.vectorStores.create({ name });
  return vectorStore.id;
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
