export type AssemblyStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED";

export type AssemblySmsStatus =
  | "PENDING"
  | "SENDING"
  | "SENT"
  | "FAILED";

export interface CreateAssemblyPayload {
  meetingDate: string;
  message: string;
}

export interface AssemblyAnnouncement {
  id: string;
  meetingDate: string;
  message: string;

  status: AssemblyStatus;

  totalRecipients: number;
  sentCount: number;
  failedCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateAssemblyResponse {
  message: string;
  data: AssemblyAnnouncement;
}

export interface AssemblyListResponse {
  data: AssemblyAnnouncement[];
}