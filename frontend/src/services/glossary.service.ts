import { apiClient } from "../api/client";

export interface GlossaryTerm {
  id: string;
  sourceTerm: string;
  preferredTerm: string;
  targetLanguage: string;
  notes: string | null;
  createdAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function getGlossaryTerms(): Promise<GlossaryTerm[]> {
  const { data } = await apiClient.get<ApiEnvelope<GlossaryTerm[]>>("/glossary");
  return data.data;
}

export async function addGlossaryTerm(payload: {
  sourceTerm: string;
  preferredTerm: string;
  targetLanguage: string;
  notes?: string;
}): Promise<GlossaryTerm> {
  const { data } = await apiClient.post<ApiEnvelope<GlossaryTerm>>("/glossary", payload);
  return data.data;
}

export async function deleteGlossaryTerm(id: string): Promise<void> {
  await apiClient.delete(`/glossary/${id}`);
}
