import { NearExpiryParams, ReportPaginationParams, AgentCommissionReportParams, CommissionPrintParams, PaginatedAgentCommissionReportResponse, CommissionDetailType, AgentCommissionDetailsResponse, PaginatedBranchCommissionReportResponse, AgentCommissionDetailsParams, AgentCommissionDetailsPrintParams } from "@repo/shared";
import prisma from "../../lib/prisma";
import { createDateRange, decimalToNumber } from "./report.helper";
import { AgentLevel, CommissionType } from "../../../generated/prisma";



const getMonthRange = (month?: string) => {
  const now = new Date();

  if (!month) {
    return {
      startOfMonth: new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ),
      endOfMonth: new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      ),
    };
  }

  const [year, monthNumber] = month.split("-").map(Number);

  if (!year || !monthNumber) {
    throw new Error("Invalid month format. Use YYYY-MM.");
  }

  return {
    startOfMonth: new Date(year, monthNumber - 1, 1),
    endOfMonth: new Date(year, monthNumber, 1),
  };
};

const getPagination = (page = 1, limit = 10) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || 10, 1);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

export const getReportsAnalyticsService = async (
  month?: string
) => {
  const now = new Date();

  const { startOfMonth, endOfMonth } = getMonthRange(month);

  const nearExpiryWhere = {
    status: "ACTIVE" as const,
    cycleStartDate: {
      gte: startOfMonth,
      lt: endOfMonth,
    },
    OR: [
      {
        remainingSales: {
          gt: 0,
        },
      },
      {
        isCompleted: false,
      },
    ],
  };

  const [
    completedWithdrawals,
    pendingWithdrawals,
    companyExpenses,
    commissions,
    availableCredits,
    recentPayments,
    recentWithdrawals,
    monthlyExpenses,
    agentsNearExpiry,
    agentsNearMaintenanceCount,
    paymentFeeds,
    withdrawalFeeds,
  ] = await Promise.all([
    prisma.creditWithdrawalRequest.aggregate({
      where: {
        status: "COMPLETED",
        completedAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    }),

    prisma.creditWithdrawalRequest.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.companyExpenseLog.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    }),

    prisma.commissionTransaction.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      _sum: {
        commissionAmount: true,
      },
      _count: {
        id: true,
      },
    }),

    prisma.agent.aggregate({
      where: {
        deletedAt: null,
      },
      _sum: {
        creditScore: true,
      },
    }),

    prisma.agentReactivationPayment.findMany({
      take: 5,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        agent: {
          select: {
            fullName: true,
            agentCode: true,
          },
        },
      },
    }),

    prisma.creditWithdrawalRequest.findMany({
      take: 5,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        agent: {
          select: {
            fullName: true,
            agentCode: true,
          },
        },
      },
    }),

    prisma.companyExpenseLog.groupBy({
      by: ["type"],
      where: {
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    }),

    prisma.agentMaintenanceCycle.findMany({
      where: nearExpiryWhere,
      take: 10,
      orderBy: {
        cycleEndDate: "asc",
      },
      include: {
        agent: {
          select: {
            fullName: true,
            agentCode: true,
            level: true,
          },
        },
      },
    }),

    prisma.agentMaintenanceCycle.count({
      where: nearExpiryWhere,
    }),

    prisma.agentReactivationPayment.findMany({
      take: 8,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        agent: {
          select: {
            id: true,
            fullName: true,
            agentCode: true,
            level: true,
          },
        },
      },
    }),

    prisma.creditWithdrawalRequest.findMany({
      take: 8,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        agent: {
          select: {
            id: true,
            fullName: true,
            agentCode: true,
            level: true,
          },
        },
      },
    }),
  ]);

  const totalCompletedWithdrawals =
    Number(completedWithdrawals._sum.amount ?? 0);

  const totalCompanyExpenses =
    Number(companyExpenses._sum.amount ?? 0);

  const totalCommissionGenerated =
    Number(commissions._sum.commissionAmount ?? 0);

  const totalAvailableCredits =
    Number(availableCredits._sum.creditScore ?? 0);

  const activityFeeds = [
    ...paymentFeeds.map((payment) => ({
      id: payment.id,
      type: "REACTIVATION_PAYMENT" as const,
      title: "Reactivation Payment",
      description: `${payment.agent.fullName} has a ${payment.status} reactivation payment.`,
      amount: Number(payment.amount),
      status: payment.status,
      createdAt: payment.updatedAt,
      agent: payment.agent,
    })),

    ...withdrawalFeeds.map((withdrawal) => ({
      id: withdrawal.id,
      type: "WITHDRAWAL" as const,
      title: "Withdrawal Request",
      description: `${withdrawal.agent.fullName} has a ${withdrawal.status} withdrawal request.`,
      amount: Number(withdrawal.amount),
      status: withdrawal.status,
      createdAt: withdrawal.updatedAt,
      agent: withdrawal.agent,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 8);

  return {
    summary: {
      totalCommissionGenerated,
      totalCompletedWithdrawals,
      totalAvailableCredits,
      totalCompanyExpenses,
      pendingWithdrawalsCount: pendingWithdrawals,
      agentsNearMaintenanceCount,
    },

    recentPayments,
    recentWithdrawals,

    monthlyExpenses: monthlyExpenses.map((item) => ({
      type: item.type,
      total: Number(item._sum.amount ?? 0),
      count: item._count.id,
    })),

    agentsNearExpiry,
    activityFeeds,
  };
};

export const getTopEarningAgentsService = async ({
  page = 1,
  limit = 10,
  month,
}: ReportPaginationParams) => {
  const pagination = getPagination(page, limit);

  const now = new Date();

  const { startOfMonth, endOfMonth } = getMonthRange(month);

  const groupedAgents =
    await prisma.commissionTransaction.groupBy({
      by: ["receiverAgentId"],
      where: {
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      _sum: {
        commissionAmount: true,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _sum: {
          commissionAmount: "desc",
        },
      },
    });

  const total = groupedAgents.length;

  const paginatedAgents = groupedAgents.slice(
    pagination.skip,
    pagination.skip + pagination.limit
  );

  const agentIds = paginatedAgents.map(
    (item) => item.receiverAgentId
  );

  const agents = await prisma.agent.findMany({
    where: {
      id: {
        in: agentIds,
      },
    },
    select: {
      id: true,
      fullName: true,
      agentCode: true,
      level: true,
    },
  });

  const agentsById = Object.fromEntries(
    agents.map((agent) => [agent.id, agent])
  );

  const data = paginatedAgents.map((item) => ({
    agent: agentsById[item.receiverAgentId] ?? null,
    totalCommission: Number(
      item._sum.commissionAmount ?? 0
    ),
    totalTransactions:
          item._count._all,
  }));

  return {
    data,
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.ceil(total / pagination.limit),
  };
};




export const getAgentsNearMaintenanceExpiryService = async ({
  page = 1,
  limit = 10,
  month,
}: NearExpiryParams & { month?: string }) => {
  const pagination = getPagination(page, limit);

  const {startOfMonth, endOfMonth} = getMonthRange(month);

  const where = {

    cycleStartDate: {
      gte: startOfMonth,
      lt: endOfMonth,
    },

    OR: [
      {
        remainingSales: {
          gt: 0,
        },
      },
      {
        isCompleted: false,
      },
    ],
  };

  const [data, total] = await prisma.$transaction([
    prisma.agentMaintenanceCycle.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        cycleEndDate: "asc",
      },
      include: {
        agent: {
          select: {
            id: true,
            fullName: true,
            agentCode: true,
            level: true,
            status: true,
          },
        },
      },
    }),

    prisma.agentMaintenanceCycle.count({
      where,
    }),
  ]);

  return {
    data,
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.ceil(total / pagination.limit),
  };
};




export const getAgentCommissionReportService = async (
  params: AgentCommissionReportParams
): Promise<PaginatedAgentCommissionReportResponse> => {
  const {
    reportType,
    startPeriod,
    endPeriod,
    searchName,
    page = 1,
    limit = 10,
  } = params;


  const safePage = Math.max(
    Number.isFinite(page) ? Math.floor(page) : 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(
      Number.isFinite(limit) ? Math.floor(limit) : 10,
      1
    ),
    100
  );

  const skip = (safePage - 1) * safeLimit;

  const scannedAt = createDateRange(
    startPeriod,
    endPeriod
  );

  const normalizedSearchName =
  searchName?.trim();

 const agentWhere = {
  deletedAt: null,

  ...(normalizedSearchName
   ? {
       fullName: {
         contains: normalizedSearchName,
         mode: "insensitive" as const,
       },
     }
   : {}),

  OR: [
    {
      commissionScans: {
        some: scannedAt
          ? {
              scannedAt,
            }
          : {},
      },
    },
    {
      commissionsEarned: {
        some: {
          commissionScan: scannedAt
            ? {
                scannedAt,
              }
            : {},
        },
      },
    },
  ],
};

  const [agents, total] = await prisma.$transaction([
    prisma.agent.findMany({
      where: agentWhere,

      skip,
      take: safeLimit,

      orderBy: {
        fullName: "asc",
      },

      select: {
        id: true,
        fullName: true,
        level: true,

        // Personal sales and transaction count
        commissionScans: {
          where: {
            ...(scannedAt ? { scannedAt } : {}),
          },

          select: {
            id: true,

            client: {
              select: {
                loanAmount: true,
              },
            },
          },
        },

        // Commissions actually received by this agent
        commissionsEarned: {
          where: {
            commissionType: {
              in: [
                CommissionType.DIRECT,
                CommissionType.DOWNLINE,
              ],
            },

            commissionScan: {
              ...(scannedAt ? { scannedAt } : {}),
            },
          },

          select: {
            id: true,
            commissionType: true,
            commissionAmount: true,
            sourceLevel: true,
            receiverLevel: true,
            sourceAgentId: true,
            receiverAgentId: true,
          },
        },
      },
    }),

    prisma.agent.count({
      where: agentWhere,
    }),
  ]);

  const data = agents.map((agent) => {
    /*
     * Number of personal scans owned by the agent.
     *
     * If you instead want the total number of commission
     * transactions received by the agent, use:
     *
     * agent.commissionsEarned.length
     */
    const transactions = agent.commissionScans.length;

    /*
     * Personal sales belong to the agent who claimed the scan.
     */
    const personalSales = agent.commissionScans.reduce(
      (total, scan) => {
        return (
          total +
          decimalToNumber(scan.client.loanAmount)
        );
      },
      0
    );

    /*
     * These transactions are already filtered by receiverAgentId
     * through the commissionsEarned relation.
     */
    const commissionTransactions =
      agent.commissionsEarned;

    const directComm =
      commissionTransactions.reduce(
        (total, transaction) => {
          const isDirectCommission =
            transaction.commissionType ===
            CommissionType.DIRECT;

          if (!isDirectCommission) {
            return total;
          }

          return (
            total +
            decimalToNumber(
              transaction.commissionAmount
            )
          );
        },
        0
      );

    /*
     * Override from L2 means:
     *
     * The current agent received a DOWNLINE commission
     * generated by a source agent whose level was L2.
     */
    const rawOverrideFromL2 =
      commissionTransactions.reduce(
        (total, transaction) => {
          const isOverrideFromL2 =
            transaction.commissionType ===
              CommissionType.DOWNLINE &&
            transaction.sourceLevel === AgentLevel.L2;

          if (!isOverrideFromL2) {
            return total;
          }

          return (
            total +
            decimalToNumber(
              transaction.commissionAmount
            )
          );
        },
        0
      );

    /*
     * Override from L3 means:
     *
     * The current agent received a DOWNLINE commission
     * generated by a source agent whose level was L3.
     */
    const rawOverrideFromL3 =
      commissionTransactions.reduce(
        (total, transaction) => {
          const isOverrideFromL3 =
            transaction.commissionType ===
              CommissionType.DOWNLINE &&
            transaction.sourceLevel === AgentLevel.L3;

          if (!isOverrideFromL3) {
            return total;
          }

          return (
            total +
            decimalToNumber(
              transaction.commissionAmount
            )
          );
        },
        0
      );

    let overrideFromL2: number | null = null;
    let overrideFromL3: number | null = null;

    switch (agent.level) {
      case AgentLevel.L1:
        overrideFromL2 = rawOverrideFromL2;
        overrideFromL3 = rawOverrideFromL3;
        break;

      case AgentLevel.L2:
        overrideFromL2 = null;
        overrideFromL3 = rawOverrideFromL3;
        break;

      case AgentLevel.L3:
        overrideFromL2 = null;
        overrideFromL3 = null;
        break;

      default:
        overrideFromL2 = null;
        overrideFromL3 = null;
        break;
    }

    const totalComm =
      directComm +
      (overrideFromL2 ?? 0) +
      (overrideFromL3 ?? 0);

    return {
      agentId: agent.id,
      fullName: agent.fullName,
      level: agent.level,
      transactions,
      personalSales,
      directComm,
      overrideFromL2,
      overrideFromL3,
      totalComm,
    };
  });

  return {
    reportType: "AGENT",
    data,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.max(
      1,
      Math.ceil(total / safeLimit)
    ),
  };
};






export const getBranchCommissionReportService = async (
  params: AgentCommissionReportParams
): Promise<PaginatedBranchCommissionReportResponse> => {
  const {
    startPeriod,
    endPeriod,
    searchName,
    page = 1,
    limit = 10,
  } = params;

  const safePage = Math.max(
    Number.isFinite(page) ? Math.floor(page) : 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(
      Number.isFinite(limit) ? Math.floor(limit) : 10,
      1
    ),
    100
  );

  const skip = (safePage - 1) * safeLimit;

  const scannedAt = createDateRange(
    startPeriod,
    endPeriod
  );

  const normalizedSearch =
    searchName?.trim();

  const branchWhere = {
    deletedAt: null,

    ...(normalizedSearch
      ? {
          OR: [
            {
              branchCode: {
                contains: normalizedSearch,
                mode: "insensitive" as const,
              },
            },
            {
              companyName: {
                contains: normalizedSearch,
                mode: "insensitive" as const,
              },
            },
            {
              location: {
                contains: normalizedSearch,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),

    commissionScans: {
      some: {
        ...(scannedAt
          ? {
              scannedAt,
            }
          : {}),
      },
    },
  };

  const [branches, total] =
    await prisma.$transaction([
      prisma.branch.findMany({
        where: branchWhere,

        skip,
        take: safeLimit,

        orderBy: [
          {
            position: "asc",
          },
          {
            branchCode: "asc",
          },
        ],

        select: {
          branchCode: true,
          companyName: true,
          location: true,

          commissionScans: {
            where: {
              ...(scannedAt
                ? {
                    scannedAt,
                  }
                : {}),
            },

            select: {
              id: true,

              client: {
                select: {
                  loanAmount: true,
                },
              },

              commissionTransactions: {
                where: {
                  commissionType: {
                    in: [
                      CommissionType.DIRECT,
                      CommissionType.DOWNLINE,
                    ],
                  },
                },

                select: {
                  commissionType: true,
                  commissionAmount: true,
                },
              },
            },
          },
        },
      }),

      prisma.branch.count({
        where: branchWhere,
      }),
    ]);

  const data = branches.map((branch) => {
    const transactions =
      branch.commissionScans.length;

    const totalSales =
      branch.commissionScans.reduce(
        (branchTotal, scan) => {
          return (
            branchTotal +
            decimalToNumber(
              scan.client.loanAmount
            )
          );
        },
        0
      );

    const commissionTransactions =
      branch.commissionScans.flatMap(
        (scan) =>
          scan.commissionTransactions
      );

    const totalDirectCommission =
      commissionTransactions.reduce(
        (total, transaction) => {
          if (
            transaction.commissionType !==
            CommissionType.DIRECT
          ) {
            return total;
          }

          return (
            total +
            decimalToNumber(
              transaction.commissionAmount
            )
          );
        },
        0
      );

    const totalDownlineCommission =
      commissionTransactions.reduce(
        (total, transaction) => {
          if (
            transaction.commissionType !==
            CommissionType.DOWNLINE
          ) {
            return total;
          }

          return (
            total +
            decimalToNumber(
              transaction.commissionAmount
            )
          );
        },
        0
      );

    const totalCommission =
      totalDirectCommission +
      totalDownlineCommission;

    return {
      branchCode: branch.branchCode,
      companyName: branch.companyName,
      location: branch.location,
      transactions,
      totalSales,
      totalDirectCommission,
      totalDownlineCommission,
      totalCommission,
    };
  });

  return {
    reportType: "BRANCH",
    data,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.max(
      1,
      Math.ceil(total / safeLimit)
    ),
  };
};




export const getCommissionReportService = async (
  params: AgentCommissionReportParams
) => {
  switch (params.reportType) {
    case "AGENT":
      return getAgentCommissionReportService(
        params
      );

    case "BRANCH":
      return getBranchCommissionReportService(
        params
      );

    default:
      throw new Error(
        "Unsupported commission report type."
      );
  }
};







export const getAgentCommissionDetailsService = async ({
  agentId,
  detailType,
  startPeriod,
  endPeriod,
  page = 1,
  limit = 5,
}: AgentCommissionDetailsParams): Promise<AgentCommissionDetailsResponse> => {
 const safePage = Math.max(
    Number.isFinite(page) ? Math.floor(page) : 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(
      Number.isFinite(limit) ? Math.floor(limit) : 5,
      1
    ),
    50
  );

  const skip = (safePage - 1) * safeLimit;

  const scannedAt = createDateRange(
    startPeriod,
    endPeriod
  );

  const transactionFilter =
    detailType === "DIRECT"
      ? {
          commissionType: CommissionType.DIRECT,
        }
      : detailType === "OVERRIDE_L2"
        ? {
            commissionType: CommissionType.DOWNLINE,
            sourceLevel: AgentLevel.L2,
          }
        : {
            commissionType: CommissionType.DOWNLINE,
            sourceLevel: AgentLevel.L3,
          };

  const commissionWhere = {
    receiverAgentId: agentId,

    ...transactionFilter,

    commissionScan: {
      ...(scannedAt ? { scannedAt } : {}),
    },
  };

  const agent = await prisma.agent.findFirst({
    where: {
      id: agentId,
      deletedAt: null,
    },

    select: {
      id: true,
      fullName: true,
    },
  });

  if (!agent) {
    throw new Error("Agent not found.");
  }

  const [
    commissionTransactions,
    total,
    totalAggregate,
  ] = await prisma.$transaction([
    prisma.commissionTransaction.findMany({
      where: commissionWhere,

      skip,
      take: safeLimit,

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        saleAmount: true,
        percentage: true,
        commissionAmount: true,
        sourceLevel: true,
        receiverLevel: true,

        sourceAgent: {
          select: {
            fullName: true,
          },
        },

        commissionScan: {
          select: {
            id: true,
            saleReference: true,
            scannedAt: true,

            client: {
              select: {
                clientName: true,
                term: true,
              },
            },
          },
        },
      },
    }),

    prisma.commissionTransaction.count({
      where: commissionWhere,
    }),

    prisma.commissionTransaction.aggregate({
      where: commissionWhere,

      _sum: {
        commissionAmount: true,
      },
    }),
  ]);

  const transactions = commissionTransactions.map(
    (transaction) => ({
      transactionId: transaction.id,

      commissionScanId:
        transaction.commissionScan.id,

      clientName:
        transaction.commissionScan.client.clientName,

      term:
        transaction.commissionScan.client.term,

      saleReference:
        transaction.commissionScan.saleReference,

      sourceAgentName:
        transaction.sourceAgent.fullName,

      sourceLevel:
        transaction.sourceLevel,

      receiverLevel:
        transaction.receiverLevel,

      saleAmount: decimalToNumber(
        transaction.saleAmount
      ),

      percentage:
        transaction.percentage === null
          ? null
          : decimalToNumber(
              transaction.percentage
            ),

      commissionAmount: decimalToNumber(
        transaction.commissionAmount
      ),

      scannedAt:
        transaction.commissionScan.scannedAt.toISOString(),
    })
  );

  return {
    agentId: agent.id,
    fullName: agent.fullName,
    detailType,
    transactions,

    totalCommission: decimalToNumber(
      totalAggregate._sum.commissionAmount
    ),

    page: safePage,
    limit: safeLimit,
    total,

    totalPages: Math.max(
      1,
      Math.ceil(total / safeLimit)
    ),
  };
};












export const getAgentCommissionPrintService = async ({
  startPeriod,
  endPeriod,
  searchName,
}: Omit<CommissionPrintParams, "reportType">) => {
  const scannedAt = createDateRange(
    startPeriod,
    endPeriod
  );

  const normalizedSearchName =
    searchName?.trim();

  const agentWhere = {
    deletedAt: null,

    ...(normalizedSearchName
      ? {
          fullName: {
            contains: normalizedSearchName,
            mode: "insensitive" as const,
          },
        }
      : {}),

    OR: [
      {
        commissionScans: {
          some: scannedAt
            ? {
                scannedAt,
              }
            : {},
        },
      },
      {
        commissionsEarned: {
          some: {
            commissionScan: scannedAt
              ? {
                  scannedAt,
                }
              : {},
          },
        },
      },
    ],
  };

  const agents = await prisma.agent.findMany({
    where: agentWhere,

    orderBy: {
      fullName: "asc",
    },

    select: {
      id: true,
      fullName: true,
      level: true,

      commissionScans: {
        where: {
          ...(scannedAt ? { scannedAt } : {}),
        },

        select: {
          id: true,

          client: {
            select: {
              loanAmount: true,
            },
          },
        },
      },

      commissionsEarned: {
        where: {
          commissionType: {
            in: [
              CommissionType.DIRECT,
              CommissionType.DOWNLINE,
            ],
          },

          commissionScan: {
            ...(scannedAt ? { scannedAt } : {}),
          },
        },

        select: {
          commissionType: true,
          commissionAmount: true,
          sourceLevel: true,
        },
      },
    },
  });

  const data = agents.map((agent) => {
    const transactions =
      agent.commissionScans.length;

    const personalSales =
      agent.commissionScans.reduce(
        (total, scan) =>
          total +
          decimalToNumber(
            scan.client.loanAmount
          ),
        0
      );

    const directComm =
      agent.commissionsEarned.reduce(
        (total, transaction) => {
          if (
            transaction.commissionType !==
            CommissionType.DIRECT
          ) {
            return total;
          }

          return (
            total +
            decimalToNumber(
              transaction.commissionAmount
            )
          );
        },
        0
      );

    const rawOverrideFromL2 =
      agent.commissionsEarned.reduce(
        (total, transaction) => {
          const isL2 =
            transaction.commissionType ===
              CommissionType.DOWNLINE &&
            transaction.sourceLevel ===
              AgentLevel.L2;

          return isL2
            ? total +
                decimalToNumber(
                  transaction.commissionAmount
                )
            : total;
        },
        0
      );

    const rawOverrideFromL3 =
      agent.commissionsEarned.reduce(
        (total, transaction) => {
          const isL3 =
            transaction.commissionType ===
              CommissionType.DOWNLINE &&
            transaction.sourceLevel ===
              AgentLevel.L3;

          return isL3
            ? total +
                decimalToNumber(
                  transaction.commissionAmount
                )
            : total;
        },
        0
      );

    let overrideFromL2: number | null = null;
    let overrideFromL3: number | null = null;

    switch (agent.level) {
      case AgentLevel.L1:
        overrideFromL2 = rawOverrideFromL2;
        overrideFromL3 = rawOverrideFromL3;
        break;

      case AgentLevel.L2:
        overrideFromL2 = null;
        overrideFromL3 = rawOverrideFromL3;
        break;

      case AgentLevel.L3:
        overrideFromL2 = null;
        overrideFromL3 = null;
        break;
    }

    const totalComm =
      directComm +
      (overrideFromL2 ?? 0) +
      (overrideFromL3 ?? 0);

    return {
      agentId: agent.id,
      fullName: agent.fullName,
      level: agent.level,
      transactions,
      personalSales,
      directComm,
      overrideFromL2,
      overrideFromL3,
      totalComm,
    };
  });

  return {
    reportType: "AGENT" as const,
    data,
  };
};

export const getBranchCommissionPrintService = async ({
  startPeriod,
  endPeriod,
  searchName,
}: Omit<CommissionPrintParams, "reportType">) => {
  const scannedAt = createDateRange(
    startPeriod,
    endPeriod
  );

  const normalizedSearch =
    searchName?.trim();

  const branchWhere = {
    deletedAt: null,

    ...(normalizedSearch
      ? {
          OR: [
            {
              branchCode: {
                contains: normalizedSearch,
                mode: "insensitive" as const,
              },
            },
            {
              companyName: {
                contains: normalizedSearch,
                mode: "insensitive" as const,
              },
            },
            {
              location: {
                contains: normalizedSearch,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),

    commissionScans: {
      some: {
        ...(scannedAt
          ? {
              scannedAt,
            }
          : {}),
      },
    },
  };

  const branches = await prisma.branch.findMany({
    where: branchWhere,

    orderBy: [
      {
        position: "asc",
      },
      {
        branchCode: "asc",
      },
    ],

    select: {
      branchCode: true,
      companyName: true,
      location: true,

      commissionScans: {
        where: {
          ...(scannedAt ? { scannedAt } : {}),
        },

        select: {
          id: true,

          client: {
            select: {
              loanAmount: true,
            },
          },

          commissionTransactions: {
            where: {
              commissionType: {
                in: [
                  CommissionType.DIRECT,
                  CommissionType.DOWNLINE,
                ],
              },
            },

            select: {
              commissionType: true,
              commissionAmount: true,
            },
          },
        },
      },
    },
  });

  const data = branches.map((branch) => {
    const transactions =
      branch.commissionScans.length;

    const totalSales =
      branch.commissionScans.reduce(
        (total, scan) =>
          total +
          decimalToNumber(
            scan.client.loanAmount
          ),
        0
      );

    const commissionTransactions =
      branch.commissionScans.flatMap(
        (scan) =>
          scan.commissionTransactions
      );

    const totalDirectCommission =
      commissionTransactions.reduce(
        (total, transaction) => {
          if (
            transaction.commissionType !==
            CommissionType.DIRECT
          ) {
            return total;
          }

          return (
            total +
            decimalToNumber(
              transaction.commissionAmount
            )
          );
        },
        0
      );

    const totalDownlineCommission =
      commissionTransactions.reduce(
        (total, transaction) => {
          if (
            transaction.commissionType !==
            CommissionType.DOWNLINE
          ) {
            return total;
          }

          return (
            total +
            decimalToNumber(
              transaction.commissionAmount
            )
          );
        },
        0
      );

    return {
      branchCode: branch.branchCode,
      companyName: branch.companyName,
      location: branch.location,
      transactions,
      totalSales,
      totalDirectCommission,
      totalDownlineCommission,
      totalCommission:
        totalDirectCommission +
        totalDownlineCommission,
    };
  });

  return {
    reportType: "BRANCH" as const,
    data,
  };
};

export const getCommissionPrintService = async ({
  reportType,
  startPeriod,
  endPeriod,
  searchName,
}: CommissionPrintParams) => {
  if (reportType === "AGENT") {
    return getAgentCommissionPrintService({
      startPeriod,
      endPeriod,
      searchName,
    });
  }

  return getBranchCommissionPrintService({
    startPeriod,
    endPeriod,
    searchName,
  });
};







export const getAgentCommissionDetailsPrintService =
  async ({
    agentId,
    detailType,
    startPeriod,
    endPeriod,
  }: AgentCommissionDetailsPrintParams) => {
    const scannedAt = createDateRange(
      startPeriod,
      endPeriod
    );

    const transactionFilter =
      detailType === "DIRECT"
        ? {
            commissionType:
              CommissionType.DIRECT,
          }
        : detailType === "OVERRIDE_L2"
          ? {
              commissionType:
                CommissionType.DOWNLINE,
              sourceLevel: AgentLevel.L2,
            }
          : {
              commissionType:
                CommissionType.DOWNLINE,
              sourceLevel: AgentLevel.L3,
            };

    const agent =
      await prisma.agent.findFirst({
        where: {
          id: agentId,
          deletedAt: null,
        },

        select: {
          id: true,
          fullName: true,
        },
      });

    if (!agent) {
      throw new Error("Agent not found.");
    }

    const commissionTransactions =
      await prisma.commissionTransaction.findMany({
        where: {
          receiverAgentId: agentId,

          ...transactionFilter,

          commissionScan: {
            ...(scannedAt
              ? { scannedAt }
              : {}),
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          saleAmount: true,
          percentage: true,
          commissionAmount: true,
          sourceLevel: true,
          receiverLevel: true,

          sourceAgent: {
            select: {
              fullName: true,
            },
          },

          commissionScan: {
            select: {
              id: true,
              saleReference: true,
              scannedAt: true,

              client: {
                select: {
                  clientName: true,
                  term: true,
                },
              },
            },
          },
        },
      });

    const transactions =
      commissionTransactions.map(
        (transaction) => ({
          transactionId:
            transaction.id,

          commissionScanId:
            transaction.commissionScan.id,

          clientName:
            transaction.commissionScan
              .client.clientName,

          term:
            transaction.commissionScan
              .client.term,

          saleReference:
            transaction.commissionScan
              .saleReference,

          sourceAgentName:
            transaction.sourceAgent.fullName,

          sourceLevel:
            transaction.sourceLevel,

          receiverLevel:
            transaction.receiverLevel,

          saleAmount:
            decimalToNumber(
              transaction.saleAmount
            ),

          percentage:
            transaction.percentage === null
              ? null
              : decimalToNumber(
                  transaction.percentage
                ),

          commissionAmount:
            decimalToNumber(
              transaction.commissionAmount
            ),

          scannedAt:
            transaction.commissionScan
              .scannedAt.toISOString(),
        })
      );

    const totalCommission =
      transactions.reduce(
        (total, transaction) =>
          total +
          transaction.commissionAmount,
        0
      );

    return {
      agentId: agent.id,
      fullName: agent.fullName,
      detailType,
      transactions,
      totalCommission,
    };
  };