// src/socket/socketEmitter.ts

import { AdminPromotionRecommendationSocketPayload, AdminReactivationPaymentSocketPayload, AdminReactivationWithdrawSocketPayload, NotificationPayload, ReactivationApprovalSocketBranchPayload, ReactivationApprovalSocketPayload } from "@repo/shared";
import { getIO } from "./index";



export const emitNotification = (
  agentId: string,
  notification: NotificationPayload
) => {

  const io = getIO();

  io.to(agentId).emit(
    "new-notification",
    notification
  );
};




export const emitAdminReactivationApproval = (
  payload: ReactivationApprovalSocketPayload
) => {
  const io = getIO();

  io.to("admin:reactivation").emit(
    "new-reactivation-approval",
    payload
  );
};

export const emitUplineReactivationApproval = (
  reviewerAgentId: string,
  payload: ReactivationApprovalSocketPayload
) => {
  const io = getIO();

  io.to(`agent:${reviewerAgentId}`).emit(
    "new-reactivation-approval",
    payload
  );
};

export const emitBranchReactivationApproval = (
  branchCode: string,
  payload: ReactivationApprovalSocketBranchPayload
) => {
  const io = getIO();

  io.to(`branch:${branchCode}`).emit(
    "branch-reactivation-updated",
    payload
  );
};

export const emitAdminPaymentUpdated = (
  payload: AdminReactivationPaymentSocketPayload
) => {
  const io = getIO();

  io.to("admin:payments").emit(
    "admin-payment-updated",
    payload
  );
};

export const emitAdminWithdrawUpdated = (
  payload: AdminReactivationWithdrawSocketPayload
) => {
  const io = getIO();

  io.to("admin:withdraw").emit(
    "admin-withdraw-updated",
    payload
  )
}

export const emitAdminPromotionRecommendation = (
  payload: AdminPromotionRecommendationSocketPayload
) => {
  const io = getIO();

  io.to("admin:promotions").emit(
    "admin-promotion-created",
    payload
  );
};