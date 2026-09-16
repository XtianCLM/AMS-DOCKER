import api from "@/lib/axios";

import {
  CommissionDetailsResponse,
  GetClientsParams,
  GetClientsResponse,
  ImportDbfResponse,
} from "@repo/shared";

export const getClientsService =
  async (
    params: GetClientsParams
  ): Promise<GetClientsResponse> => {
    const res = await api.post(
      "/clients/getClients",
      {},
      {
        params,
      }
    );

    return res.data;
  };

export const getCommissionDetailsService =
  async (
    clientId: string
  ): Promise<CommissionDetailsResponse> => {

    const res = await api.get(
      `/clients/commission/details/${clientId}`
    );

    return res.data;
  };




export const importClientsDbfService =
  async (
    file: File
  ): Promise<ImportDbfResponse> => {
    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    const res = await api.post(
      "/clients/import-dbf",
      formData
    );

    return res.data;
  };