export type AgentLevel = "L1" | "L2" | "L3";
export interface SearchAgentsParams {
  search?: string
}

export interface AgentSearchResult {

  id: string;

  fullName: string;

  level: string;

  status: string;

  agentCode: string;

  saleMaintenance: number;

}

export type SearchAgentsResponse =
  AgentSearchResult[];


export interface SearchBranchParams {
  search?: string;
}

/* =========================================
   GLOBAL UPLINE AVAILABILITY
========================================= */
export interface BranchUplineAvailability {
  id: string;

  fullName: string;

  level: "L1" | "L2";

  agentCode: string;

  /* GLOBAL DOWNLINE COUNTS */
  l2Count: number;

  l3Count: number;

  /* GLOBAL SLOT AVAILABILITY */
  availableL2Slots: number;

  availableL3Slots: number;

  hasVacancy: boolean;
}

/* =========================================
   BRANCH CAPACITY
   ONLY L1 IS BRANCH-BASED
========================================= */
export interface BranchCapacity {

  /* BRANCH COUNTS */
  totalL1: number;

  totalL2: number;

  totalL3: number;

  /* ONLY VALID BRANCH SLOT */
  availableL1Slots: number;
}

/* =========================================
   BRANCH RESULT
========================================= */
export interface BranchSearchResult {
  branchCode: string;

  companyName: string | null;
}

export type SearchBranchResponse =
  BranchSearchResult[];


export interface GetPendingAgentParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}



export interface PendingAgents {
  id:string
  createdAt: string;

  fullName: string;

  level: string;

  status: string;


}

export interface GetPendingAgentResponse {
  data: PendingAgents[];

  total: number;

  page: number;

  limit: number;

  totalPages: number;
}






export interface GetMasterlistParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface MasterlistBranch {
  branch: {
    branchCode: string;
    companyName?: string;
  };
}

export interface Masterlists {
  id:string
  agentCode: string;

  accountType: string;

  fullName: string;

  level: string;

  status: string;

  branches: MasterlistBranch[];
}

export interface GetMasterlistResponse {
  data: Masterlists[];

  total: number;

  page: number;

  limit: number;

  totalPages: number;
}




export interface GetTransactionParams {
  agentId: string;
  page?: number;
  limit?: number;
}


export interface AgentTransaction {
  id: string;

  saleReference?: string | null;

  saleAmount: string;

  commissionAmount: string;

  percentage?: string | null;

  sourceLevel: string;

  commissionType: string

  remarks?: string | null;

  createdAt: string;

  sourceAgent: {
    id: string;

    fullName: string;

    level: string;

    agentCode: string;
  };

  receiverAgent: {
    id: string;

    fullName: string;

    level: string;

    agentCode: string;
  };
}

export interface GetTransactionResponse {
  data: AgentTransaction[];

  total: number;

  page: number;

  limit: number;

  totalPages: number;
}


export interface TransactionHistParams {
  agentId: string;
  limit?: number;
  month?: number;
  year?: number;
}

export type TransactionHistType =
  | "COMMISSION"
  | "WITHDRAWAL";

export interface TransactionHist {
  id: string;

  type: TransactionHistType;

  transactionType: string;

  amount: number;

  status: string;

  remarks?: string | null;

  createdAt: string;

  saleReference?: string | null;
  saleAmount?: string | number | null;
  commissionAmount?: string | number | null;
  percentage?: string | number | null;
  sourceLevel?: string | null;
  commissionType?: string | null;

  sourceAgent?: {
    id: string;
    fullName: string;
    level: string;
    agentCode: string;
  } | null;

  receiverAgent?: {
    id: string;
    fullName: string;
    level: string;
    agentCode: string;
  } | null;

  payoutChannel?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
}

export interface GetTransactionHistResponse {
  data: TransactionHist[];
  total: number;
  limit: number;
  totalPages: number;
}


// export interface ScannedAgentParams {
//   agentCode: string;
//   clientId: string;
// }

// export interface ScannedAgentBranch {
//   id: string;

//   branchId: string;

//   branch: {
//     branchCode: string;

//     companyName?: string | null;

//     location?: string | null;
//   };
// }

// export interface ScannedAgentResponse {
//   agent: {
//     id: string;
//     agentCode: string;
//     accountType: string;
//     fullName: string;
//     level: string;
//     status: string;
//     branches: ScannedAgentBranch[];
//   };

//   client: {
//     id: string;
//     clientName: string;
//     loanAmount: number;
//     term: number;
//   };

//   uplines: {
//     id: string;
//     agentCode: string;
//     fullName: string;
//     level: string;
//     status: string;
//   }[];

//   directCommission: {
//     amount: number;

//     rule: {
//       id: string;
//       formulaType: string;
//       piraRate: number;
//       agentStatus: string;
//     };
//   };

//   overrideCommissions: {
//     agent: {
//       id: string;
//       agentCode: string;
//       fullName: string;
//       level: string;
//       status: string;
//     };

//     amount: number;

//     blocked: boolean;

//     reason: string | null;

//     ruleId: string | null;
//   }[];
// }


export interface AgentMaintenanceCycle {

  id: string;

  cycleMonth: number;

  cycleYear: number;

  cycleStartDate: string;

  cycleEndDate: string;

  requiredSales: number;

  completedSales: number;

  remainingSales: number;

  isCompleted: boolean;

  isFirstCycle: boolean;

  completedAt?: string | null;

  expiredAt?: string | null;

  status: string;

  createdAt: string;
}

export interface AgentNotification {
  id: string;
  agentId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | Date;

  actionType?: string | null;
  entityId?: string | null;
  actionResult?: string | null;
}

export interface GetAgentDetailsParams {
  agentId: string;
}

export interface AgentDetailsParent {
  id: string;

  fullName: string;

  level: string;

  agentCode: string;
}


export interface AgentDetailsDownline {
  id: string;

  fullName: string;

  level: string;

  status: string;

}


export interface AgentCommission {
  id: string;

  saleAmount: string;

  commissionAmount: string;

  sourceLevel: string;

  createdAt: string;

  sourceAgent: {
    fullName: string;

    level: string;
  };
}

export interface GetAgentDetailsResponse {

  id: string;

  agentCode: string;

  profilePicture: string;

  username: string;

  fullName: string;

  gender?: string | null;

  birthDate?: string | null;

  address?: string | null;

  email?: string | null;

  telephone?: string | null;

  creditScore: number;

  status: string;

  accountType: string;

  level: string;

  parentAgent?: AgentDetailsParent | null;



  downlines: AgentDetailsDownline[];

  commissionsEarned: AgentCommission[];

  maintenanceCycles: AgentMaintenanceCycle[];

  notifications: AgentNotification[];

  createdAt: string;
}



export interface CheckUniqueInfoParams {
  username?: string;
  email?: string;
  telephone?: string;
}

export interface CheckUniqueInfoResponse {
  usernameExists: boolean;
  emailExists: boolean;
  telephoneExists: boolean;
}

export interface UpdateAgentAccountResponse {
  message: string;
}


export interface DirectCommissionParams {
    treshold:number;
    formulaType:string;
    installmentAmount:number;
    term:number;
    piraRate:number;
}


export interface GetRemainingSalesParams {
  agentId: string;
}

export interface GetRemainingSalesResponse {
  status: string;
  remainingSales: number;
}


export interface SubmitAdminReactivationResponse {
  message: string;
  data: {
    id: string;
    agentId: string;
    requestType: "ADMIN_APPROVAL";
    status: "PENDING";
  };
}

export interface SubmitReactivationResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    agentId: string;
    status: string;
    requestType: string;
    createdAt: string;
  };
}

export interface ReviewReactivationApprovalPayload {
  approvalId: string;
  status: "APPROVED" | "REJECTED";
  remarks?: string;


  requiredSales?: number;
  probationStartDate?: string;
  probationEndDate?: string;
}


export interface ReactivationApprovalItem {
  id: string;
  requestId: string;
  reviewerType: "ADMIN" | "UPLINE_AGENT";
  reviewerUserId?: number | null;
  reviewerAgentId?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvalOrder: number;
  isRequired: boolean;
  assignedAt: string;
  decidedAt?: string | null;
  remarks?: string | null;

  request: {
    id: string;
    agentId: string;
    requestType: "ADMIN_APPROVAL" | "SELF_REACTIVATION";
    status: string;
    reason?: string | null;
    createdAt: string;

    agent: {
      id: string;
      fullName: string;
      agentCode: string;
      level: string;
      status: string;
    };

    attachments: {
      id: string;
      fileName: string;
      filePath: string;
      fileType: string;
      fileSize: number;
      uploadedAt: string;
    }[];
  };
}


export interface GetMyReactivationApprovalsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
}

export interface GetMyReactivationApprovalsResponse {
  data: ReactivationApprovalItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReviewReactivationApprovalPayload {
  approvalId: string;
  status: "APPROVED" | "REJECTED";
  remarks?: string;
}

export interface ReviewReactivationApprovalResponse {
  message: string;
  data: {
    approvalId: string;
    requestId: string;
    approvalStatus: "APPROVED" | "REJECTED";
    requestStatus: string;
  };
}







// Edit Agent Types

// packages/shared/src/types/agent/agent-edit.types.ts

export type AgentGender =
  | "MALE"
  | "FEMALE";


export type AgentStatus =
  | "ACTIVE"
  | "PROBATION"
  | "EXPIRED"
  | "DROPPED"
  | "SUSPENDED"
  | "PENDING"
  | "REJECTED";

export type AgentEditDetails = {
  id: string;
  fullName: string;
  agentCode: string;
  username: string | null;
  level: AgentLevel;
  status: AgentStatus;
  gender: AgentGender | null;
  birthDate: string | null;
  address: string | null;
  email: string | null;
  telephone: string | null;
  secondaryTel: string | null;
};

export type UpdateAgentDetailsPayload = {
  fullName: string;
  username: string | null;
  level: AgentLevel;
  gender: AgentGender | null;
  birthDate: string | null;
  address: string | null;
  email: string | null;
  telephone: string | null;
  secondaryTel: string | null;

  newUplineId?: string | null;
};



export type UpdateAgentResponse = {
  message: string;
  data: AgentEditDetails;
};


export type AgentFormState = {
  fullName: string;
  username: string;
  level: string;
  gender: string;
  birthDate: string;
  address: string;
  email: string;
  telephone: string;
  secondaryTel: string;
};

export const emptyAgentForm: AgentFormState = {
  fullName: "",
  username: "",
  level: "L1",
  gender: "",
  birthDate: "",
  address: "",
  email: "",
  telephone: "",
  secondaryTel: "",
};




// Agent Recommendation for promotion types
export type PromotionRecommendationStatus =
  | "PENDING"
  | "PROMOTED"
  | "REJECTED";

export interface AgentPromotionRecommendationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PromotionRecommendationStatus | "ALL";
}


export type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

export interface AgentPromotionRecommendationItem {
  id: string;

  status: PromotionRecommendationStatus;

  remarks: string | null;

  createdAt: string;
  updatedAt: string;

  agent: {
    id: string;
    fullName: string;
    agentCode: string;
    level: string;
    status: string;
  };

  submittedByUser: {
    id: number;
    name: string;
  } | null;
}

export interface AgentPromotionRecommendationResponse {
  data: AgentPromotionRecommendationItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}




export type PromotionPayload = {
  PromotedTo:string;
  newUplineId?: string | null;
}

export interface PromotionApprovalResponse {
  recommendation: {
    id: string;
    agentId: string;
    status: string;
    remarks?: string | null;
    createdAt: string;
    updatedAt: string;
  };

  agent: {
    id: string;
    agentCode: string;
    fullName: string;
    level: AgentLevel;
    parentAgentId: string | null;
  };
}
export type RejectPromotionPayload = {
  remarks: string;
};

export type RejectPromotionParams = {
  RecomId: string;
  payload: RejectPromotionPayload;
};






// Agent WEb Acc Transaction Views
export interface AgentMonthlyTransactionCount {
  month: number;
  label: string;
  count: number;
}

export interface AgentMonthlyTransactionResponse {
  agent: {
    id: string;
    fullName: string;
    agentCode: string;
    level: string;
  };

  year: number;

  totalTransactions: number;

  monthlyTransactions:
    AgentMonthlyTransactionCount[];
}



// Agent RecomPromotion Types
export interface CreatePromotionRecommendationPayload {
  agentId: string;
  remarks?: string | null;
}

export interface CreatePromotionRecommendationResponse {
  id: string;
  agentId: string;
  submittedByUserId?: number | null;
  status: string;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}