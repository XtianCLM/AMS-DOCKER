export interface ReportsAnalyticsSummary {
  totalCommissionGenerated: number;
  totalCompletedWithdrawals: number;
  totalAvailableCredits: number;
  totalCompanyExpenses: number;
  pendingWithdrawalsCount: number;
  agentsNearMaintenanceCount: number;
}

export interface ReportsRecentPayment {
  id: string;
  amount: string | number;
  status: string;
  updatedAt: string;
  agent: {
    fullName: string;
    agentCode: string;
  };
}

export interface ReportsRecentWithdrawal {
  id: string;
  amount: string | number;
  status: string;
  updatedAt: string;
  agent: {
    fullName: string;
    agentCode: string;
  };
}

export interface ReportsTopAgent {
  agent: {
    id: string;
    fullName: string;
    agentCode: string;
    level: string;
  } | null;
  totalCommission: number;
  totalTransactions: number;
}

export interface ReportsMonthlyExpense {
  type: string;
  total: number;
  count: number;
}

export interface ReportsAgentNearExpiry {
  id: string;
  remainingSales: number;
  cycleEndDate: string;
  status: string;
  agent: {
    fullName: string;
    agentCode: string;
    level: string;
  };
}

export interface ReportPaginationParams {
  page?: number;
  limit?: number;
  month?: string;
};

export interface PaginatedTopEarningAgentsResponse {
  data: ReportsTopAgent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetTopEarningAgentsApiResponse {
  success: boolean;
  data: PaginatedTopEarningAgentsResponse;
}


export type ActivityFeedType =
  | "REACTIVATION_PAYMENT"
  | "WITHDRAWAL";

export interface ReportsActivityFeed {
  id: string;
  type: ActivityFeedType;
  title: string;
  description: string;
  amount: string | number;
  status: string;
  createdAt: string;
  agent: {
    id: string;
    fullName: string;
    agentCode: string;
    level?: string;
  };
}

export interface ReportsAnalyticsResponse {
  summary: ReportsAnalyticsSummary;
  recentPayments: ReportsRecentPayment[];
  recentWithdrawals: ReportsRecentWithdrawal[];
  monthlyExpenses: ReportsMonthlyExpense[];
  agentsNearExpiry: ReportsAgentNearExpiry[];
  activityFeeds: ReportsActivityFeed[];
}
export interface GetReportsAnalyticsApiResponse {
  success: boolean;
  data: ReportsAnalyticsResponse;
}




export interface NearExpiryParams {
  page?: number;
  limit?: number;
  month?: string;
};

export interface MaintenanceNearExpiryAgent {
  id: string;
  agentId: string;
  cycleMonth: number;
  cycleYear: number;
  requiredSales: number;
  completedSales: number;
  remainingSales: number;
  cycleEndDate: string;
  status: string;
  agent: {
    id: string;
    fullName: string;
    agentCode: string;
    level: string;
    status: string;
  };
}

export interface PaginatedMaintenanceNearExpiryResponse {
  data: MaintenanceNearExpiryAgent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetMaintenanceNearExpiryApiResponse {
  success: boolean;
  data: PaginatedMaintenanceNearExpiryResponse;
}












export type ReportType = "AGENT" | "BRANCH";

export interface AgentCommissionReportParams {
  reportType: ReportType;
  startPeriod?: string;
  endPeriod?: string;
  searchName?: string;
  page?: number;
  limit?: number;
}
export interface AgentCommissionReportResponse {
  agentId: string;
  fullName: string;
  level: string;
  transactions: number;
  personalSales: number;
  directComm: number;
  overrideFromL2: number | null;
  overrideFromL3: number | null;
  totalComm: number;
}

export interface PaginatedAgentCommissionReportResponse {
  reportType: "AGENT";
  data: AgentCommissionReportResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}


export interface GetAgentCommissionReportApiResponse {
  success: boolean;
  data: PaginatedAgentCommissionReportResponse;
}





export interface BranchCommissionReportResponse {
  branchCode: string;
  companyName: string | null;
  location: string | null;
  transactions: number;
  totalSales: number;
  totalDirectCommission: number;
  totalDownlineCommission: number;
  totalCommission: number;
}

export interface PaginatedBranchCommissionReportResponse {
  reportType: "BRANCH";
  data: BranchCommissionReportResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type CommissionReportResponse =
  | PaginatedAgentCommissionReportResponse
  | PaginatedBranchCommissionReportResponse;

export interface GetCommissionReportApiResponse {
  success: boolean;
  data: CommissionReportResponse;
}





export interface AgentCommissionDetailsParams {
  agentId: string;
  detailType: CommissionDetailType;
  startPeriod: string;
  endPeriod: string;
  page?: number;
  limit?: number;
}

export type CommissionDetailType =
  | "DIRECT"
  | "OVERRIDE_L2"
  | "OVERRIDE_L3";

export interface AgentCommissionDetailTransaction {
  transactionId: string;
  commissionScanId: string;
  clientName: string;
  saleReference: string | null;
  sourceAgentName: string;
  sourceLevel: string;
  receiverLevel: string;
  saleAmount: number;
  percentage: number | null;
  commissionAmount: number;
  scannedAt: string;
  term: number | null;
}

export interface AgentCommissionDetailsResponse {
  agentId: string;
  fullName: string;
  detailType: CommissionDetailType;
  transactions: AgentCommissionDetailTransaction[];
  totalCommission: number;

  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetAgentCommissionDetailsApiResponse {
  success: boolean;
  data: AgentCommissionDetailsResponse;
}



export interface AgentCommissionDetailsPrintParams {
  agentId: string;
  detailType: CommissionDetailType;
  startPeriod: string;
  endPeriod: string;
}


export interface CommissionPrintParams{
  reportType: ReportType;
  startPeriod?: string;
  endPeriod?: string;
  searchName?: string;
}

export interface AgentCommissionPrintResponse {
  reportType: "AGENT";
  data: AgentCommissionReportResponse[];
}

export interface BranchCommissionPrintResponse {
  reportType: "BRANCH";
  data: BranchCommissionReportResponse[];
}

export type CommissionPrintResponse =
  | AgentCommissionPrintResponse
  | BranchCommissionPrintResponse;

export interface GetCommissionPrintApiResponse {
  success: boolean;
  data: CommissionPrintResponse;
}