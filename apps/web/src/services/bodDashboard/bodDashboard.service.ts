import { CommissionPayoutData } from "@/app/(AMS)/BodDashboard/components/CommissionPayoutTrend";
import { LoanCommissionChartData } from "@/app/(AMS)/BodDashboard/components/LoanDisbursementCommissionChart";
import api from "@/lib/axios";

import {
  BodDashboardFilters,
  BodDashboardOverviewResponse,
  AgentManagementParams,
  AgentManagementResponse,
} from "@repo/shared";


export const getBodDashboardOverviewService =
  async (
    params:
      BodDashboardFilters
  ): Promise<BodDashboardOverviewResponse> => {

    const res =
      await api.get(
        "/bod-dashboard/overview",
        {
          params: {
            period:
              params.period,

            company:
              params.company ??
              "ALL",

            branch:
              params.branch ??
              "ALL",
          },
        }
      );


    return res.data;
  };






export const getAgentManagementService =
  async (
    params:
      AgentManagementParams
  ): Promise<AgentManagementResponse> => {

    const res =
      await api.get(
        "/bod-dashboard/agents",
        {
          params: {
            page:
              params.page,

            pageSize:
              params.pageSize,

            period:
              params.period,

            company:
              params.company,

            branch:
              params.branch,

            level:
              params.level,

            status:
              params.status,
          },
        }
      );

    return res.data;
  };


  export const getCommissionPayoutsTrendService =
  async (year: number): Promise<CommissionPayoutData[]> => {
    const response = await api.get(
      "/bod-dashboard/commission-payouts-trend",
      {
        params: { year },
      }
    );

    return response.data;
  };


export const getLoanCommissionTrendService =
  async (year: number) => {
    const response = await api.get<
      LoanCommissionChartData[]
    >(
      "/bod-dashboard/loan-commission-trend",
      {
        params: { year },
      }
    );

    return response.data;
  };