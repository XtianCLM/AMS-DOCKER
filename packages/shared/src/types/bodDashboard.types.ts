export type DashboardPeriod =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "ANNUAL";

export interface BodDashboardFilters {
  period: DashboardPeriod;
  company?: string;
  branch?: string;
}

export interface DashboardMetric {
  value: number;
  previousValue?: number;
  percentageChange?: number;
  trend: number[];
}

export interface ActiveAgentMetric {
  value: number;
  percentageOfTotal: number;
}

export interface LoanDashboardMetric
  extends DashboardMetric {
  totalLoanAmount: number;
}

export interface BodDashboardOverviewResponse {
  totalAgents: DashboardMetric;

  activeAgents: ActiveAgentMetric;

  loansDisbursed: LoanDashboardMetric;

  commissionsPaid: DashboardMetric;

  range: {
    start: string;
    end: string;
  };
}


export interface DashboardDistributionItem {
  name: string;
  value: number;
}

export interface AgentLevelDistributionItem {
  level: string;
  value: number;
}

export interface BodDashboardOverviewResponse {
  totalAgents: DashboardMetric;

  activeAgents: ActiveAgentMetric;

  loansDisbursed: LoanDashboardMetric;

  commissionsPaid: DashboardMetric;

  agentStatusDistribution: DashboardDistributionItem[];

  agentLevelDistribution: AgentLevelDistributionItem[];

  range: {
    start: string;
    end: string;
  };
}

export interface TopPerformingAgent {
  rank: number;

  agentId: string;

  agentCode: string;

  agentName: string;

  level: string;

  status: string;

  loans: number;

  totalCommission: number;

  streak: number;
}

export interface BodDashboardOverviewResponse {
  totalAgents: DashboardMetric;

  activeAgents: ActiveAgentMetric;

  loansDisbursed: LoanDashboardMetric;

  commissionsPaid: DashboardMetric;

  agentStatusDistribution: DashboardDistributionItem[];

  agentLevelDistribution: AgentLevelDistributionItem[];

  topPerformingAgents: TopPerformingAgent[];

  range: {
    start: string;
    end: string;
  };
}

export type AgentManagementStatus =
  | "ALL"
  | "ACTIVE"
  | "EXPIRED"
  | "SUSPENDED"
  | "DROPPED"
  | "REMOVE";

export type AgentManagementLevel =
  | "ALL"
  | "L1"
  | "L2"
  | "L3";

export interface AgentManagementParams {
  page: number;
  pageSize?: number;

  company?: string;
  branch?: string;

  level?: AgentManagementLevel;
  status?: AgentManagementStatus;

  period?: DashboardPeriod;
}

export interface AgentManagementRow {
  id: string;
  agentCode: string;
  name: string;
  level: string;

  upline: {
    id: string;
    name: string;
    agentCode: string;
  } | null;

  branch: {
    branchCode: string;
    branchName: string;
  } | null;

  status: string;

  sales: number;
  commission: number;
}

export interface AgentManagementResponse {
  data: AgentManagementRow[];

  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}