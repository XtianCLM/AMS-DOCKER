import {
  useQuery,
} from "@tanstack/react-query";

import {
  BodDashboardFilters,
  AgentManagementParams,
} from "@repo/shared";
import { getAgentManagementService, getBodDashboardOverviewService, getCommissionPayoutsTrendService, getLoanCommissionTrendService } from "@/services/bodDashboard/bodDashboard.service";




export const useBodDashboardOverview =
  (
    params:
      BodDashboardFilters
  ) => {

    return useQuery({
      queryKey: [
        "bod-dashboard",
        "overview",
        params.period,
        params.company,
        params.branch,
      ],

      queryFn: () =>
        getBodDashboardOverviewService(
          params
        ),

      staleTime:
        30_000,

      refetchOnWindowFocus:
        false,
    });
  };


export const useAgentManagement = (
  params: AgentManagementParams,
  options?: {
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: [
      "bod-dashboard",
      "agent-management",
      params.page,
      params.pageSize,
      params.period,
      params.company,
      params.branch,
      params.level,
      params.status,
    ],

    queryFn: () =>
      getAgentManagementService(params),

    enabled: options?.enabled ?? true,

    placeholderData: (previousData) =>
      previousData,
  });
};



export const useCommissionPayoutsTrend = (
  year: number
) => {
  return useQuery({
    queryKey: [
      "bod-dashboard",
      "commission-payouts-trend",
      year,
    ],
    queryFn: () =>
      getCommissionPayoutsTrendService(year),
    staleTime: 60_000,
  });
};


export const useLoanCommissionTrend = (
  year: number
) => {
  return useQuery({
    queryKey: [
      "bod-dashboard",
      "loan-commission-trend",
      year,
    ],
    queryFn: () =>
      getLoanCommissionTrendService(year),
    staleTime: 60_000,
  });
};