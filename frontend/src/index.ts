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

export const ApplicationType = {
  FullTime: "Full Time",
  PartTime: "Part Time",
  Internship: "Internship",
} as const;

export type ApplicationType = (typeof ApplicationType)[keyof typeof ApplicationType];

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
  title: string;
  status?: ApplicationStatus;
  type?: ApplicationType | null;
  date_applied?: string | null;
  deadline?: string | null;
  url?: string | null;
  location?: string | null;
  pay?: string | null;
  notes?: string | null;
  resume_version?: string | null;
}

export interface ApplicationRead {
  id: number;
  user_id: number;
  company: string;
  title: string;
  status: ApplicationStatus;
  type: ApplicationType | null;
  date_applied: string | null;
  deadline: string | null;
  url: string | null;
  location: string | null;
  pay: string | null;
  notes: string | null;
  resume_version: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApplicationPage {
  items: ApplicationRead[];
  total: number;
  has_more: boolean;
}

export interface ApplicationSuggestions {
  companies: string[];
  titles: string[];
  locations: string[];
}

export type ApplicationSortField =
  | "created_at"
  | "title"
  | "company"
  | "status"
  | "location"
  | "type"
  | "date_applied"
  | "deadline";

export type ApplicationCustomFilterField = "title" | "company" | "location";

export interface ApplicationsQuery {
  limit: number;
  offset: number;
  q?: string;
  status?: ApplicationStatus;
  type?: ApplicationType;
  date_applied_from?: string;
  date_applied_to?: string;
  custom_field?: ApplicationCustomFilterField;
  custom_value?: string;
  sort_field?: ApplicationSortField;
  sort_dir?: "asc" | "desc";
}

export interface ApplicationUpdate {
  company?: string | null;
  title?: string | null;
  status?: ApplicationStatus | null;
  type?: ApplicationType | null;
  date_applied?: string | null;
  deadline?: string | null;
  url?: string | null;
  location?: string | null;
  pay?: string | null;
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
