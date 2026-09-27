import { apiClient } from "../api/client";

export interface DocumentRecord {
  id: string;
  originalFileName: string;
  fileType: string;
  targetLanguage: string;
  downloadFileName: string;
  createdAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function translateDocument(
  file: File,
  targetLanguage: string,
): Promise<DocumentRecord> {
  const formData = new FormData();
  formData.append("document", file);
  formData.append("targetLanguage", targetLanguage);

  const { data } = await apiClient.post<ApiEnvelope<DocumentRecord>>(
    "/documents/translate",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data;
}

export async function getDocumentHistory(): Promise<{ items: DocumentRecord[]; total: number }> {
  const { data } = await apiClient.get<ApiEnvelope<{ items: DocumentRecord[]; total: number }>>(
    "/documents/history",
  );
  return data.data;
}

export async function downloadDocument(id: string, fileName: string): Promise<void> {
  const { data } = await apiClient.get(`/documents/${id}/download`, { responseType: "blob" });
  const url = window.URL.createObjectURL(data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
