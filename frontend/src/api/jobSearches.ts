import client from "./client";
import type { JobSearchCreate, JobSearchRead, JobSearchUpdate } from "../index";

export async function getJobSearches(): Promise<JobSearchRead[]> {
  const res = await client.get<JobSearchRead[]>("/job-searches");
  return res.data;
}

export async function createJobSearch(data: JobSearchCreate): Promise<JobSearchRead> {
  const res = await client.post<JobSearchRead>("/job-searches", data);
  return res.data;
}

export async function updateJobSearch(
  id: number,
  data: JobSearchUpdate
): Promise<JobSearchRead> {
  const res = await client.put<JobSearchRead>(`/job-searches/${id}`, data);
  return res.data;
}

export async function deleteJobSearch(id: number): Promise<void> {
  await client.delete(`/job-searches/${id}`);
}
