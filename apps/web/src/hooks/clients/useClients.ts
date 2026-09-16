import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getClientsService, getCommissionDetailsService, importClientsDbfService } from "@/services/clients/clients.service";

import {
  GetClientsParams,
} from "@repo/shared";

export const useGetClients = (
  params: GetClientsParams
) => {
  return useQuery({
    queryKey: ["clients", params],

    queryFn: () =>
      getClientsService(params),
  });
};


export const useGetCommissionDetails = (
  clientId?: string
) => {
  return useQuery({
    queryKey: [
      "commission-details",
      clientId,
    ],

    queryFn: () =>
      getCommissionDetailsService(
        clientId!
      ),

    enabled: !!clientId,
  });
};


export const useImportClientsDbf =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        importClientsDbfService,

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            "clients",
          ],
        });
      },
    });
  };