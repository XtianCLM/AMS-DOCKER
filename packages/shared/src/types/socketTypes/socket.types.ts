export interface NotificationPayload {
  id?: string;

  title: string;

  message: string;

  type: string;

  isRead?: boolean;

  createdAt: Date;

  actionType?: string | null;
  entityId?: string | null;
  actionResult?: string | null;
}


export interface ReactivationApprovalSocketPayload {
  requestId: string;
  approvalId: string;
  agentId: string;
  agentName: string;
  reviewerType: "ADMIN" | "UPLINE_AGENT";
  title: string;
  message: string;
  createdAt: Date;
}

export interface ReactivationApprovalSocketBranchPayload {
  requestId: string;
  approvalId: string;

  branchCode?: string;

  agentId: string;
  agentName: string;

  reviewerType: "ADMIN";

  status: "APPROVED" | "REJECTED";

  title: string;
  message: string;
  createdAt: Date;
}

export interface AdminReactivationPaymentSocketPayload {
  paymentId: string;
  requestId: string;
  agentId: string;
  status: string;
  title: string;
  message: string;
  createdAt: Date;
}

export interface AdminReactivationWithdrawSocketPayload {
  withdrawId: string;
  agentId: string;
  status: string;
  amount: number;
  payoutChannel: string;
  createdAt: Date;
}


export interface AdminPromotionRecommendationSocketPayload {
  recommendationId: string;
  agentId: string;
  agentName: string;
  agentCode: string;
  level: string;
  status: string;
  createdAt: Date | string;
}

