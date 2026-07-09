// Mirrors backend models.py schemas. Dates/datetimes arrive as ISO strings from JSON.

export const ApplicationStatus = {
  ToApply: "To Apply",
  Applied: "Applied",
  Screening: "Screening",
  Interview: "Interview",
  Offer: "Offer",
  Rejected: "Rejected",
  Withdrawn: "Withdrawn",
} as const;

export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export interface UserCreate {
  email: string;
  password: string;
}

export interface UserRead {
  id: number;
  email: string;
  created_at: string | null;
}

export interface ApplicationCreate {
  company: string;
  role: string;
  status?: ApplicationStatus;
  date_applied?: string | null;
  deadline?: string | null;
  job_url?: string | null;
  notes?: string | null;
  resume_version?: string | null;
}

export interface ApplicationRead {
  id: number;
  user_id: number;
  company: string;
  role: string;
  status: ApplicationStatus;
  date_applied: string | null;
  deadline: string | null;
  job_url: string | null;
  notes: string | null;
  resume_version: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApplicationUpdate {
  company?: string | null;
  role?: string | null;
  status?: ApplicationStatus | null;
  date_applied?: string | null;
  deadline?: string | null;
  job_url?: string | null;
  notes?: string | null;
  resume_version?: string | null;
}

export interface DeleteAccount {
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}
