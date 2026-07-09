import client from "./client";
import type { ApplicationCreate, ApplicationRead, ApplicationUpdate } from "../index";

export async function getApplications(): Promise<ApplicationRead[]> {
  const res = await client.get<ApplicationRead[]>("/applications");
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
