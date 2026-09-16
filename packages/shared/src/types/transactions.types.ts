export type TransacListParams = {
  userId?: number;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};


export type PaymentDashboardTab = "PAYMENTS" | "WITHDRAW";

export type ReactivationPaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export type WithdrawalStatus =
  | "PENDING"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED"
  | "CANCELLED";

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}



export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type CompanyExpenseType =
  | "XENDIT_PAYOUT_FEE"
  | "XENDIT_PAYMENT_FEE"
  | "MANUAL_ADJUSTMENT";

export type CompanyExpenseSource =
  | "WITHDRAWAL"
  | "REACTIVATION_PAYMENT"
  | "SYSTEM";

export interface CompanyExpenseLog {
  id: string;
  type: CompanyExpenseType;
  sourceType: CompanyExpenseSource;
  sourceId?: string | null;
  amount: string | number;
  rate?: string | number | null;
  description?: string | null;
  createdBy?: number | null;
  rawData?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReactivationPayment {
  id: string;
  requestId: string;
  agentId: string;
  amount: string | number;
  currency: string;
  provider: string;
  status: ReactivationPaymentStatus;
  checkoutUrl?: string | null;
  xenditPaymentSessionId?: string | null;
  xenditReferenceId?: string | null;
  paidAt?: string | null;
  failedAt?: string | null;
  expiredAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;


  companyExpenses?: CompanyExpenseLog[];
  companyExpenseTotal?: string | number;

  agent: {
    id: string;
    fullName: string;
    agentCode: string;
    level: string;
  };

  request: {
    id: string;
    status: string;
    requestType: string;
    requestedAt: string;
  };
}


export interface AdminWithdrawalRequest {
  id: string;
  agentId: string;
  amount: string | number;
  payoutChannel: string;
  accountName: string;
  accountNumber: string;
  status: WithdrawalStatus;
  xenditExternalId?: string | null;
  xenditDisbursementId?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  requestedAt: string;
  approvedBy?: number | null;
  approvedAt?: string | null;
  completedAt?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;



  companyExpenses?: CompanyExpenseLog[];
  companyExpenseTotal?: string | number;
  agent: {
    id: string;
    fullName: string;
    agentCode: string;
    level: string;
  };


}