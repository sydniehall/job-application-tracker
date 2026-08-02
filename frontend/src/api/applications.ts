import client from "./client";
import type {
  ApplicationCreate,
  ApplicationPage,
  ApplicationRead,
  ApplicationSuggestions,
  ApplicationUpdate,
  ApplicationsQuery,
} from "../index";

export async function getApplications(query: ApplicationsQuery): Promise<ApplicationPage> {
  const res = await client.get<ApplicationPage>("/applications", { params: query });
  return res.data;
}

export async function getApplicationSuggestions(
  jobSearchId?: number
): Promise<ApplicationSuggestions> {
  const res = await client.get<ApplicationSuggestions>("/applications/suggestions", {
    params: { job_search_id: jobSearchId },
  });
  return res.data;
}

export async function createApplication(data: ApplicationCreate): Promise<ApplicationRead> {
  const res = await client.post<ApplicationRead>("/applications", data);
  return res.data;
}

export async function updateApplication(
  id: number,
  data: ApplicationUpdate
): Promise<ApplicationRead> {
  const res = await client.put<ApplicationRead>(`/applications/${id}`, data);
  return res.data;
}

export async function deleteApplication(id: number): Promise<void> {
  await client.delete(`/applications/${id}`);
}
