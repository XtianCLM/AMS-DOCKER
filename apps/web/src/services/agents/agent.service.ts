import api from "@/lib/axios";

import {
  AgentEditDetails,
  AgentMonthlyTransactionResponse,
  AgentPromotionRecommendationParams,
  AgentPromotionRecommendationResponse,
  CheckUniqueInfoParams,
  CheckUniqueInfoResponse,
  CreatePromotionRecommendationPayload,
  CreatePromotionRecommendationResponse,
  GetAgentDetailsParams,
  GetAgentDetailsResponse,
  GetMasterlistParams,
  GetMasterlistResponse,
  GetPendingAgentParams,
  GetPendingAgentResponse,
  GetRemainingSalesParams,
  GetRemainingSalesResponse,
  GetTransactionHistResponse,
  GetTransactionParams,
  GetTransactionResponse,
  PromotionApprovalResponse,
  PromotionPayload,
  RegisterAgentSchema,
  RejectPromotionParams,
  ScannedAgentParams,
  ScannedAgentResponse,
  SearchAgentsParams,
  SearchAgentsResponse,
  SearchBranchParams,
  SearchBranchResponse,
  TransactionHistParams,
  UpdateAdminAccSchema,
  UpdateAgentAccountResponse,
  UpdateAgentAccSchema,
  UpdateAgentDetailsPayload,
  UpdateAgentResponse,

} from "@repo/shared";

export const searchAgentsService =
  async (
    params: SearchAgentsParams
  ): Promise<SearchAgentsResponse> => {

    const res = await api.get(
      "/agents/searchAgent",
      {
        params,
      }
    );

    return res.data;
  };

export const searchAgentsReactivateService =
  async (
    params: SearchAgentsParams
  ): Promise<SearchAgentsResponse> => {

    const res = await api.get(
      "/agents/searchAgentReactivate",
      {
        params,
      }
    );

    return res.data;
  };

export const searchBranchesService=
  async (
    params: SearchBranchParams
  ): Promise<SearchBranchResponse> => {
        const res = await api.get(
            "agents/searchBranch",
            {
                params,
            }
        );
    return res.data;
  }



export const checkUniqueInfoService =
  async (
    payload: CheckUniqueInfoParams
  ): Promise<CheckUniqueInfoResponse> => {

    const res = await api.post(
      "/agents/checkUniqueInfo",
      payload
    );

    return res.data.data;
  };

// export const registerAgentService =
//   async (
//     payload: RegisterAgentSchema
//   ) => {

//     const res =
//       await api.post(
//         "/agents/registerAgent",
//         payload
//       );

//     return res.data;
//   };

export const registerAgentService =
  async (
    payload: FormData
  ) => {
    const res =
      await api.post(
        "/agents/registerAgent",
        payload
      );

    return res.data;
  };


export const getPendingAgentService =
  async (
    params: GetPendingAgentParams
  ): Promise<GetPendingAgentResponse> => {
    const res = await api.post(
      "/agents/getPendingAgent",
      {},
      {
        params,
      }
    );

    return res.data;
  };


export const getMasterlistService =
  async (
    params: GetMasterlistParams
  ): Promise<GetMasterlistResponse> => {
    const res = await api.post(
      "/agents/getMasterlist",
      {},
      {
        params,
      }
    );

    return res.data;
  };


export const updatePendingAgentStatusService = 
  async(
    agentId:string,
    status: "ACTIVE" | "REJECTED"
) =>{
   const res = await api.patch(
    "/agents/updateRegistration",
    {
      agentId,
      status
    }
   );
   return res.data;
};

export const DroppedorSuspendedAgentStatusService = 
  async(
    agentId:string,
    status:  "DROPPED" | "SUSPENDED"
) =>{
   const res = await api.patch(
    "/agents/droppedorSuspendedAgent",
    {
      agentId,
      status
    }
   );
   return res.data;
};





export const getAgentTransactionsService =
  async (
    params: GetTransactionParams
  ): Promise<GetTransactionResponse> => {

    const res =
      await api.get(
        `/agents/details/${params.agentId}/transactions`,
        {
          params: {
            page: params.page,
            limit: params.limit,
          },
        }
      );

    return res.data;
  };


  
export const getAgentDetailsService =
  async (
    params: GetAgentDetailsParams
  ): Promise<GetAgentDetailsResponse> => {

    const res =
      await api.get(
        `/agents/details/${params.agentId}`
      );

    return res.data;
  };

export const getAgentTransactionsHistService =
  async (
    params: TransactionHistParams
  ): Promise<GetTransactionHistResponse> => {

    const res =
      await api.get(
        `/agents/transactions/${params.agentId}/history`,
        {
         params: {
            limit: params.limit,
            month: params.month,
            year: params.year,
          },
        }
      );

    return res.data;
  };


export const readAllNotifService = 
  async(
    agentId:string
  ) => {
    const res = await api.patch(
      `/agents/read-all/${agentId}`,
      
    );

    return res.data;
  }


export const updateAgentAccountService =
  async (
    payload: UpdateAgentAccSchema
  ): Promise<UpdateAgentAccountResponse> => {

    const res = await api.patch(
      "/agents/update-account",
      payload
    );

    return res.data;
  };


export const updateAdminAccountService =
  async (
    payload: UpdateAdminAccSchema
  ): Promise<UpdateAgentAccountResponse> => {

    const res = await api.patch(
      "/agents/update-admin-account",
      payload
    );

    return res.data;
  };



export const getRemainingSalesService =
  async (
    params: GetRemainingSalesParams
  ): Promise<GetRemainingSalesResponse> => {

    const res = await api.get(
      `/agents/remaining-sales/${params.agentId}`
    );

    return res.data;
  };


// Edit Agent 
export async function getAgentEditDetails(
  agentId: string
): Promise<AgentEditDetails> {
  const response =
    await api.get<AgentEditDetails>(
      `/agents/${agentId}/edit-details`
    );

  return response.data;
}

export async function updateAgentDetails(
  params: {
    agentId: string;
    payload: UpdateAgentDetailsPayload;
  }
): Promise<UpdateAgentResponse> {
  const response =
    await api.patch<UpdateAgentResponse>(
      `/agents/${params.agentId}/edit-details`,
      params.payload
    );

  return response.data;
}


export const getAgentPromotionRecommendations =
  async (
    params: AgentPromotionRecommendationParams
  ) => {
    const response =
      await api.get<
        AgentPromotionRecommendationResponse & {
          success: boolean;
          message: string;
        }
      >(
        "/agents/promotion-recommendations",
        {
          params,
        }
      );

    return response.data;
  };




export const approvePromotionRecommendation =
  async (
    recommendationId: string,
    payload: PromotionPayload
  ) => {
    const response =
      await api.patch<{
        success: boolean;
        message: string;
        data: PromotionApprovalResponse;
      }>(
        `/agents/${recommendationId}/promotion-approved`,
        payload
      );

    return response.data.data;
  };


export const rejectPromotionRecommendation =
  async ({
    RecomId,
    payload,
  }: RejectPromotionParams) => {
    const response =
      await api.patch(
        `/agents/${RecomId}/promotion-rejected`,
        payload
      );

    return response.data.data;
  };



export const getAgentMonthlyTransactions =
  async (
    agentId: string,
    year?: number
  ) => {
    const response =
      await api.get<{
        success: boolean;
        data:
          AgentMonthlyTransactionResponse;
      }>(
        `/agents/${agentId}/monthly-transactions`,
        {
          params: {
            year,
          },
        }
      );

    return response.data.data;
  };




export const createPromotionRecommendation =
  async (
    payload:
      CreatePromotionRecommendationPayload
  ) => {
    const response =
      await api.post<{
        success: boolean;
        message: string;
        data:
          CreatePromotionRecommendationResponse;
      }>(
        "agents/RecoPromotion",
        payload
      );

    return response.data.data;
  };