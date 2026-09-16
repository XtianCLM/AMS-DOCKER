export type ClientStatus =
  | "New"
  | "Pending"
  | "Paid";


export interface GetClientsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface Client {
  id:string;
  clientName: string;
  loanAmount: number;
  clientStatus: string;
  createdAt: string;
}

export interface GetClientsResponse {
  data: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


export interface AgentCommissionInfo {
  id: string;
  agentCode: string;
  accountType: string;
  fullName: string;
  status:string;
  level: string;
  email: string | null;
  profilePicture: string;
}

export interface CommissionRuleInfo {
  id: string;
  name: string;
  piraRate: number;
}


export interface CommissionDetailsParams {
  clientId: string;
}

export interface CommissionDetailsResponse {
  id: string;
  payoutChannel: string;
  saleReference: string | null;

  client: {
    id: string;
    clientName: string;
    loanAmount: number;
    clientStatus: string;
    term:number;
  };

  branch: {
    branchCode: string;
    companyName: string;
  };

  scanner: {
    id: number;
    name: string;
    username: string;
  } | null;

  commissionTransactions: {
    id: string;

    commissionType: string;

    saleAmount: number;

    commissionAmount: number;

    receiverLevel: string;

    percentage: number | null;

    sourceAgent: AgentCommissionInfo;

    receiverAgent: AgentCommissionInfo;

    commissionRule: CommissionRuleInfo;
  }[];
}
export interface CommissionDetailsParams {
  clientId: string;
}

export interface CommissionDetailsResponse {
  id: string;

  saleReference: string | null;

  AgentScannedStatus: string | null;

  client: {
    id: string;
    clientName: string;
    loanAmount: number;
    clientStatus: string;
    term:number;
  };

  branch: {
    branchCode: string;
    companyName: string;
  };

  scanner: {
    id: number;
    name: string;
    username: string;
  } | null;

  commissionTransactions: {
    id: string;

    commissionType: string;

    saleAmount: number;

    commissionAmount: number;

    receiverLevel: string;

    percentage: number | null;

    sourceAgent: AgentCommissionInfo;

    receiverAgent: AgentCommissionInfo;

    

    commissionRule:CommissionRuleInfo;
  }[];
}


export interface ImportDbfResponse {
  message: string;
  totalDbfRecords: number;
  validRecords: number;
  insertedRecords: number;
}