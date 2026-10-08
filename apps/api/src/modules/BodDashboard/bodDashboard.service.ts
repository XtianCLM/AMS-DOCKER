


import { AgentManagementParams, AgentManagementResponse, BodDashboardOverviewResponse, DashboardPeriod } from "@repo/shared";
import {
  AgentStatus,
  Prisma,
} from "../../../generated/prisma";

import prisma from "../../lib/prisma";


interface DashboardFilters {
  period: DashboardPeriod;
  company?: string;
  branch?: string;
}


// =====================================================
// DATE HELPERS
// =====================================================

const startOfDay = (
  date: Date
) => {
  const result =
    new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
};


const endOfDay = (
  date: Date
) => {
  const result =
    new Date(date);

  result.setHours(
    23,
    59,
    59,
    999
  );

  return result;
};


// =====================================================
// CURRENT + PREVIOUS PERIOD
// =====================================================

const getDashboardRange = (
  period: DashboardPeriod
) => {
  const now =
    new Date();

  let start:
    Date;

  let end:
    Date;

  let previousStart:
    Date;

  let previousEnd:
    Date;


  switch (period) {

    // -------------------------------------------------
    // DAILY
    // -------------------------------------------------

    case "DAILY": {
      start =
        startOfDay(now);

      end =
        endOfDay(now);


      previousStart =
        new Date(start);

      previousStart.setDate(
        previousStart.getDate() -
        1
      );

      previousStart =
        startOfDay(
          previousStart
        );


      previousEnd =
        endOfDay(
          previousStart
        );

      break;
    }


    // -------------------------------------------------
    // WEEKLY
    // Monday -> Sunday
    // -------------------------------------------------

    case "WEEKLY": {
      const currentDay =
        now.getDay();

      const daysFromMonday =
        currentDay === 0
          ? 6
          : currentDay - 1;


      start =
        new Date(now);

      start.setDate(
        now.getDate() -
        daysFromMonday
      );

      start =
        startOfDay(start);


      end =
        new Date(start);

      end.setDate(
        start.getDate() +
        6
      );

      end =
        endOfDay(end);


      previousStart =
        new Date(start);

      previousStart.setDate(
        previousStart.getDate() -
        7
      );

      previousStart =
        startOfDay(
          previousStart
        );


      previousEnd =
        new Date(
          previousStart
        );

      previousEnd.setDate(
        previousStart.getDate() +
        6
      );

      previousEnd =
        endOfDay(
          previousEnd
        );

      break;
    }


    // -------------------------------------------------
    // MONTHLY
    // -------------------------------------------------

    case "MONTHLY": {
      start =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );


      end =
        new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );


      previousStart =
        new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );


      previousEnd =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
          23,
          59,
          59,
          999
        );

      break;
    }


    // -------------------------------------------------
    // ANNUAL
    // -------------------------------------------------

    case "ANNUAL": {
      start =
        new Date(
          now.getFullYear(),
          0,
          1
        );


      end =
        new Date(
          now.getFullYear(),
          11,
          31,
          23,
          59,
          59,
          999
        );


      previousStart =
        new Date(
          now.getFullYear() -
          1,
          0,
          1
        );


      previousEnd =
        new Date(
          now.getFullYear() -
          1,
          11,
          31,
          23,
          59,
          59,
          999
        );

      break;
    }
  }


  return {
    start,
    end,
    previousStart,
    previousEnd,
  };
};


// =====================================================
// PERCENTAGE CHANGE
// =====================================================

const calculatePercentageChange = (
  current: number,
  previous: number
) => {

  if (previous === 0) {

    return current > 0
      ? 100
      : 0;
  }


  return Number(
    (
      (
        (
          current -
          previous
        ) /
        previous
      ) *
      100
    ).toFixed(1)
  );
};


// =====================================================
// AGENT LOCATION FILTER
//
// Agent
//   -> branches AgentBranch[]
//   -> AgentBranch.branchId
//   -> AgentBranch.branch
//   -> Branch.companyId
// =====================================================

const buildAgentLocationWhere = (
  company?: string,
  branch?: string
): Prisma.AgentWhereInput => {

  const hasCompany =
    Boolean(
      company &&
      company !== "ALL"
    );

  const hasBranch =
    Boolean(
      branch &&
      branch !== "ALL"
    );


  // Branch + company selected
  if (
    hasBranch &&
    hasCompany
  ) {
    return {
      branches: {
        some: {
          isActive: true,

          branchId:
            branch,

          branch: {
            companyId:
              company,

            deletedAt:
              null,
          },
        },
      },
    };
  }


  // Only branch selected
  if (hasBranch) {
    return {
      branches: {
        some: {
          isActive: true,

          branchId:
            branch,
        },
      },
    };
  }


  // Only company selected
  if (hasCompany) {
    return {
      branches: {
        some: {
          isActive: true,

          branch: {
            companyId:
              company,

            deletedAt:
              null,
          },
        },
      },
    };
  }


  return {};
};





// =====================================================
// COMMISSION SCAN LOCATION FILTER
//
// CommissionScan.branchId -> Branch.branchCode
// CommissionScan.branch -> Branch
// Branch.companyId -> Company.companyCode
// =====================================================

const buildScanLocationWhere = (
  company?: string,
  branch?: string
): Prisma.CommissionScanWhereInput => {

  const hasCompany =
    Boolean(
      company &&
      company !== "ALL"
    );

  const hasBranch =
    Boolean(
      branch &&
      branch !== "ALL"
    );


  if (
    hasBranch &&
    hasCompany
  ) {
    return {
      branchId:
        branch,

      branch: {
        companyId:
          company,

        deletedAt:
          null,
      },
    };
  }


  if (hasBranch) {
    return {
      branchId:
        branch,
    };
  }


  if (hasCompany) {
    return {
      branch: {
        companyId:
          company,

        deletedAt:
          null,
      },
    };
  }


  return {};
};


// =====================================================
// TREND BUCKETS
// =====================================================

const createBuckets = (
  start: Date,
  end: Date,
  bucketCount = 8
) => {

  const startTime =
    start.getTime();

  const endTime =
    end.getTime();

  const duration =
    endTime -
    startTime +
    1;


  const bucketSize =
    duration /
    bucketCount;


  return Array.from(
    {
      length:
        bucketCount,
    },
    (_, index) => {

      const bucketStart =
        new Date(
          startTime +
          bucketSize *
          index
        );


      const bucketEnd =
        index ===
        bucketCount - 1
          ? new Date(
              endTime
            )
          : new Date(
              startTime +
              bucketSize *
              (index + 1)
          );


      return {
        start:
          bucketStart,

        end:
          bucketEnd,

        isLast:
          index ===
          bucketCount - 1,
      };
    }
  );
};


// =====================================================
// COUNT TREND
// =====================================================

const bucketDates = (
  dates: Date[],
  start: Date,
  end: Date
) => {

  const buckets =
    createBuckets(
      start,
      end
    );


  return buckets.map(
    (
      bucket
    ) => {

      return dates.filter(
        (date) => {

          if (
            bucket.isLast
          ) {
            return (
              date >=
                bucket.start &&
              date <=
                bucket.end
            );
          }


          return (
            date >=
              bucket.start &&
            date <
              bucket.end
          );
        }
      ).length;
    }
  );
};


// =====================================================
// AMOUNT TREND
// =====================================================

const bucketAmounts = (
  rows: {
    date: Date;
    amount: number;
  }[],
  start: Date,
  end: Date
) => {

  const buckets =
    createBuckets(
      start,
      end
    );


  return buckets.map(
    (
      bucket
    ) => {

      return rows
        .filter(
          (row) => {

            if (
              bucket.isLast
            ) {
              return (
                row.date >=
                  bucket.start &&
                row.date <=
                  bucket.end
              );
            }


            return (
              row.date >=
                bucket.start &&
              row.date <
                bucket.end
            );
          }
        )
        .reduce(
          (
            total,
            row
          ) =>
            total +
            row.amount,
          0
        );
    }
  );
};


// =====================================================
// CUMULATIVE TREND
//
// Used for TOTAL AGENTS.
//
// Instead of:
//   3, 5, 2, 7
//
// we show actual total growth:
//
//   1003, 1008, 1010, 1017
// =====================================================

const makeCumulativeTrend = (
  startingValue: number,
  values: number[]
) => {

  let runningTotal =
    startingValue;


  return values.map(
    (value) => {

      runningTotal +=
        value;

      return runningTotal;
    }
  );
};


// =====================================================
// BOD DASHBOARD OVERVIEW
// =====================================================

export const getBodDashboardOverview =
  async (
    filters: DashboardFilters
  ): Promise<BodDashboardOverviewResponse> => {

    const {
      start,
      end,
      previousStart,
      previousEnd,
    } =
      getDashboardRange(
        filters.period
      );


    const agentLocationWhere =
      buildAgentLocationWhere(
        filters.company,
        filters.branch
      );

    const [
        agentStatusGrouped,
        agentLevelGrouped,
        ] = await Promise.all([
        prisma.agent.groupBy({
            by: [
            "status",
            ],

            where: {
            ...agentLocationWhere,
            deletedAt: null,
            createdAt: {
                lte: end,
            },
            },

            _count: {
            _all: true,
            },
        }),

        prisma.agent.groupBy({
            by: [
            "level",
            ],

            where: {
            ...agentLocationWhere,
            deletedAt: null,
            createdAt: {
                lte: end,
            },
            },

            _count: {
            _all: true,
            },
        }),
    ]);


    const agentStatusDistribution =
    agentStatusGrouped.map(
        (item) => ({
        name:
            item.status,
        value:
            item._count._all,
        })
    );


    const agentLevelDistribution =
    agentLevelGrouped.map(
        (item) => ({
        level:
            item.level,
        value:
            item._count._all,
        })
    );


    const scanLocationWhere =
      buildScanLocationWhere(
        filters.company,
        filters.branch
      );
    

      

    // Only add commissionScan relation filtering
    // when company/branch is actually selected.
    const hasScanLocationFilter =
      Object.keys(
        scanLocationWhere
      ).length > 0;


    const commissionLocationWhere:
      Prisma.CommissionTransactionWhereInput =
        hasScanLocationFilter
          ? {
              commissionScan: {
                is:
                  scanLocationWhere,
              },
            }
          : {};


    // =================================================
    // AGENTS
    // =================================================


    // =====================================================
    // TOP PERFORMING AGENTS
    // =====================================================

    const performanceScans =
    await prisma.commissionScan.findMany({
        where: {
        ...scanLocationWhere,

        scannedAt: {
            gte: start,
            lte: end,
        },

        agent: {
            is: {
            ...agentLocationWhere,

            deletedAt: null,
            },
        },
        },

        select: {
        claimedByAgentId: true,
        },
    });


    // -----------------------------------------------------
    // Count loans per agent
    // -----------------------------------------------------

    const loanCountMap =
    new Map<string, number>();

    for (
    const scan
    of performanceScans
    ) {

    loanCountMap.set(
        scan.claimedByAgentId,

        (
        loanCountMap.get(
            scan.claimedByAgentId
        ) ?? 0
        ) + 1
    );
    }


    // -----------------------------------------------------
    // Get candidate agent IDs
    // -----------------------------------------------------

    const candidateAgentIds =
    Array.from(
        loanCountMap.keys()
    );


    // -----------------------------------------------------
    // Commission totals
    // -----------------------------------------------------

    const commissionRows =
    candidateAgentIds.length > 0
        ? await prisma
            .commissionTransaction
            .findMany({
            where: {
                receiverAgentId: {
                in:
                    candidateAgentIds,
                },

                createdAt: {
                gte: start,
                lte: end,
                },

                ...commissionLocationWhere,
            },

            select: {
                receiverAgentId:
                true,

                commissionAmount:
                true,
            },
            })
        : [];


    // -----------------------------------------------------
    // Sum commissions per receiver
    // -----------------------------------------------------

    const commissionMap =
    new Map<string, number>();

    for (
    const transaction
    of commissionRows
    ) {

    commissionMap.set(
        transaction.receiverAgentId,

        (
        commissionMap.get(
            transaction.receiverAgentId
        ) ?? 0
        ) +
        Number(
            transaction
            .commissionAmount
        )
    );
    }


    // -----------------------------------------------------
    // Load agent information
    // -----------------------------------------------------

    const performanceAgents =
    candidateAgentIds.length > 0
        ? await prisma.agent.findMany({
            where: {
            id: {
                in:
                candidateAgentIds,
            },

            ...agentLocationWhere,

            deletedAt:
                null,
            },

            select: {
            id: true,

            agentCode:
                true,

            fullName:
                true,

            level:
                true,

            status:
                true,

            consecutiveMonthsActive:
                true,
            },
        })
        : [];


    // -----------------------------------------------------
    // Build + rank result
    // -----------------------------------------------------

    const topPerformingAgents =
    performanceAgents
        .map(
        (
            agent
        ) => ({
        rank: 0,

        agentId:
          agent.id,

        agentCode:
          agent.agentCode,

        agentName:
          agent.fullName,

        level:
          agent.level,

        status:
          agent.status,

        loans:
          loanCountMap.get(
            agent.id
          ) ?? 0,

        totalCommission:
          commissionMap.get(
            agent.id
          ) ?? 0,

        streak:
          agent
            .consecutiveMonthsActive,
      })
    )
    .sort(
      (
        first,
        second
      ) => {

        // Primary:
        // highest loan count

        if (
          second.loans !==
          first.loans
        ) {
          return (
            second.loans -
            first.loans
          );
        }


        // Secondary:
        // highest commission

        return (
          second.totalCommission -
          first.totalCommission
        );
      }
    )
    .slice(
      0,
      10
    )
    .map(
      (
        agent,
        index
      ) => ({
        ...agent,

        rank:
          index + 1,
      })
    );

    const [
      totalAgents,
      previousTotalAgents,
      activeAgents,
      currentPeriodAgents,
    ] =
      await Promise.all([

        // Current total agents
        prisma.agent.count({
          where: {
            ...agentLocationWhere,

            deletedAt:
              null,

            createdAt: {
              lte:
                end,
            },
          },
        }),


        // Total agents at the end
        // of previous period
        prisma.agent.count({
          where: {
            ...agentLocationWhere,

            deletedAt:
              null,

            createdAt: {
              lte:
                previousEnd,
            },
          },
        }),


        // Current active agents
        prisma.agent.count({
          where: {
            ...agentLocationWhere,

            deletedAt:
              null,

            status:
              AgentStatus.ACTIVE,

            createdAt: {
              lte:
                end,
            },
          },
        }),


        // Agents created during
        // current selected period
        prisma.agent.findMany({
          where: {
            ...agentLocationWhere,

            deletedAt:
              null,

            createdAt: {
              gte:
                start,

              lte:
                end,
            },
          },

          select: {
            createdAt:
              true,
          },
        }),
      ]);


    // =================================================
    // LOANS / CLIENTS SCANNED
    // =================================================

    const [
      currentScans,
      previousLoanCount,
    ] =
      await Promise.all([

        prisma.commissionScan.findMany({
          where: {
            ...scanLocationWhere,

            scannedAt: {
              gte:
                start,

              lte:
                end,
            },
          },

          select: {
            scannedAt:
              true,

            client: {
              select: {
                loanAmount:
                  true,
              },
            },
          },
        }),


        prisma.commissionScan.count({
          where: {
            ...scanLocationWhere,

            scannedAt: {
              gte:
                previousStart,

              lte:
                previousEnd,
            },
          },
        }),
      ]);


    const loansDisbursed =
      currentScans.length;


    const totalLoanAmount =
      currentScans.reduce(
        (
          total,
          scan
        ) => {

          return (
            total +
            Number(
              scan.client
                .loanAmount ??
                0
            )
          );
        },
        0
      );


    // =================================================
    // COMMISSIONS
    // =================================================

    const [
      currentCommissions,
      previousCommissionAggregate,
    ] =
      await Promise.all([

        prisma
          .commissionTransaction
          .findMany({
            where: {
              ...commissionLocationWhere,

              createdAt: {
                gte:
                  start,

                lte:
                  end,
              },
            },

            select: {
              createdAt:
                true,

              commissionAmount:
                true,
            },
          }),


        prisma
          .commissionTransaction
          .aggregate({
            where: {
              ...commissionLocationWhere,

              createdAt: {
                gte:
                  previousStart,

                lte:
                  previousEnd,
              },
            },

            _sum: {
              commissionAmount:
                true,
            },
          }),
      ]);


    const commissionsPaid =
      currentCommissions.reduce(
        (
          total,
          transaction
        ) => {

          return (
            total +
            Number(
              transaction
                .commissionAmount
            )
          );
        },
        0
      );


    const previousCommissionsPaid =
      Number(
        previousCommissionAggregate
          ._sum
          .commissionAmount ??
          0
      );


    // =================================================
    // TRENDS
    // =================================================

    // Registrations during period
    const agentRegistrationTrend =
      bucketDates(
        currentPeriodAgents.map(
          (agent) =>
            agent.createdAt
        ),
        start,
        end
      );


    // Convert registrations into cumulative
    // total-agent numbers.
    const agentTrend =
      makeCumulativeTrend(
        previousTotalAgents,
        agentRegistrationTrend
      );


    // Number of loans/scans per bucket
    const loanTrend =
      bucketDates(
        currentScans.map(
          (scan) =>
            scan.scannedAt
        ),
        start,
        end
      );


    // Commission amount per bucket
    const commissionTrend =
      bucketAmounts(
        currentCommissions.map(
          (
            transaction
          ) => ({
            date:
              transaction
                .createdAt,

            amount:
              Number(
                transaction
                  .commissionAmount
              ),
          })
        ),
        start,
        end
      );


    // =================================================
    // RESPONSE
    // =================================================

    return {

      totalAgents: {
        value:
          totalAgents,

        previousValue:
          previousTotalAgents,

        percentageChange:
          calculatePercentageChange(
            totalAgents,
            previousTotalAgents
          ),

        trend:
          agentTrend,
      },


      activeAgents: {
        value:
          activeAgents,

        percentageOfTotal:
          totalAgents > 0
            ? Number(
                (
                  (
                    activeAgents /
                    totalAgents
                  ) *
                  100
                ).toFixed(1)
              )
            : 0,
      },


      loansDisbursed: {
        value:
          loansDisbursed,

        previousValue:
          previousLoanCount,

        percentageChange:
          calculatePercentageChange(
            loansDisbursed,
            previousLoanCount
          ),

        totalLoanAmount,

        trend:
          loanTrend,
      },


      commissionsPaid: {
        value:
          commissionsPaid,

        previousValue:
          previousCommissionsPaid,

        percentageChange:
          calculatePercentageChange(
            commissionsPaid,
            previousCommissionsPaid
          ),

        trend:
          commissionTrend,
      },

        agentStatusDistribution,

        agentLevelDistribution,

        topPerformingAgents,

      range: {
        start:
          start.toISOString(),

        end:
          end.toISOString(),
      },
    };
  };










// =====================================================
// PERIOD RANGE
// =====================================================

const getPeriodRange = (
  period:
    | "DAILY"
    | "WEEKLY"
    | "MONTHLY"
    | "ANNUAL" =
      "MONTHLY"
) => {

  const now =
    new Date();

  let start =
    new Date();

  let end =
    new Date();


  switch (period) {

    case "DAILY":
      start =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        );

      end =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );

      break;


    case "WEEKLY": {
      const day =
        now.getDay();

      const diff =
        day === 0
          ? -6
          : 1 - day;


      start =
        new Date(now);

      start.setDate(
        now.getDate() +
        diff
      );

      start.setHours(
        0,
        0,
        0,
        0
      );


      end =
        new Date(start);

      end.setDate(
        start.getDate() +
        6
      );

      end.setHours(
        23,
        59,
        59,
        999
      );

      break;
    }


    case "MONTHLY":
      start =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

      end =
        new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );

      break;


    case "ANNUAL":
      start =
        new Date(
          now.getFullYear(),
          0,
          1
        );

      end =
        new Date(
          now.getFullYear(),
          11,
          31,
          23,
          59,
          59,
          999
        );

      break;
  }


  return {
    start,
    end,
  };
};


// =====================================================
// AGENT MANAGEMENT
// =====================================================

export const getAgentManagementService =
  async (
    params:
      AgentManagementParams
  ): Promise<AgentManagementResponse> => {

    const page =
      Math.max(
        params.page ?? 1,
        1
      );


    const pageSize =
      Math.min(
        Math.max(
          params.pageSize ??
          10,
          1
        ),
        100
      );


    const skip =
      (
        page -
        1
      ) *
      pageSize;


    const {
      start,
      end,
    } =
      getPeriodRange(
        params.period ??
        "MONTHLY"
      );


    // =================================================
    // AGENT FILTER
    // =================================================

    const where:
      Prisma.AgentWhereInput =
      {
        deletedAt:
          null,
      };


    if (
      params.level &&
      params.level !== "ALL"
    ) {
      where.level =
        params.level;
    }


    if (
      params.status &&
      params.status !== "ALL"
    ) {
      where.status =
        params.status;
    }

    if (
      params.branch &&
      params.branch !== "ALL"
    ) {
      where.branches = {
        some: {
          branchId:
            params.branch,

          isActive:
            true,
        },
      };
    } else if (
      params.company &&
      params.company !== "ALL"
    ) {
      where.branches = {
        some: {
          isActive:
            true,

          branch: {
            companyId:
              params.company,

            deletedAt:
              null,
          },
        },
      };
    }


    // =================================================
    // MAIN QUERY
    // =================================================

    const [
      agents,
      total,
    ] =
      await Promise.all([

        prisma.agent.findMany({
          where,

          skip,

          take:
            pageSize,

          orderBy: [
            {
              fullName:
                "asc",
            },
          ],

          select: {
            id:
              true,

            agentCode:
              true,

            fullName:
              true,

            level:
              true,

            status:
              true,


            parentAgent: {
              select: {
                id:
                  true,

                fullName:
                  true,

                agentCode:
                  true,
              },
            },


            branches: {
              where: {
                isActive:
                  true,
              },

              orderBy: {
                assignedAt:
                  "desc",
              },

              take:
                1,

              select: {
                branch: {
                  select: {
                    branchCode:
                      true,

                    companyName:
                      true,

                    location:
                      true,
                  },
                },
              },
            },
          },
        }),


        prisma.agent.count({
          where,
        }),
      ]);


    if (
      agents.length ===
      0
    ) {
      return {
        data: [],
        page,
        pageSize,
        total,
        totalPages:
          Math.ceil(
            total /
            pageSize
          ),
      };
    }


    const agentIds =
      agents.map(
        (
          agent
        ) =>
          agent.id
      );


    // =================================================
    // SALES
    //
    // Sales = sum of client loanAmount for scans
    // claimed by each agent.
    // =================================================

    const scans =
      await prisma
        .commissionScan
        .findMany({
          where: {
            claimedByAgentId: {
              in:
                agentIds,
            },

            scannedAt: {
              gte:
                start,

              lte:
                end,
            },
          },

          select: {
            claimedByAgentId:
              true,

            client: {
              select: {
                loanAmount:
                  true,
              },
            },
          },
        });


    const salesMap =
      new Map<
        string,
        number
      >();


    for (
      const scan
      of scans
    ) {

      const amount =
        Number(
          scan.client
            .loanAmount ??
          0
        );


      salesMap.set(
        scan.claimedByAgentId,

        (
          salesMap.get(
            scan.claimedByAgentId
          ) ??
          0
        ) +
        amount
      );
    }


    // =================================================
    // COMMISSION
    //
    // Commission = all commission received by agent.
    // =================================================

    const commissions =
      await prisma
        .commissionTransaction
        .findMany({
          where: {
            receiverAgentId: {
              in:
                agentIds,
            },

            createdAt: {
              gte:
                start,

              lte:
                end,
            },
          },

          select: {
            receiverAgentId:
              true,

            commissionAmount:
              true,
          },
        });


    const commissionMap =
      new Map<
        string,
        number
      >();


    for (
      const transaction
      of commissions
    ) {

      const amount =
        Number(
          transaction
            .commissionAmount
        );


      commissionMap.set(
        transaction
          .receiverAgentId,

        (
          commissionMap.get(
            transaction
              .receiverAgentId
          ) ??
          0
        ) +
        amount
      );
    }


    // =================================================
    // RESPONSE
    // =================================================

    const data =
      agents.map(
        (
          agent
        ) => {

          const latestBranch =
            agent
              .branches[0]
              ?.branch;


          return {
            id:
              agent.id,

            agentCode:
              agent.agentCode,

            name:
              agent.fullName,

            level:
              agent.level,

            upline:
              agent.parentAgent
                ? {
                    id:
                      agent
                        .parentAgent
                        .id,

                    name:
                      agent
                        .parentAgent
                        .fullName,

                    agentCode:
                      agent
                        .parentAgent
                        .agentCode,
                  }
                : null,

            branch:
              latestBranch
                ? {
                    branchCode:
                      latestBranch
                        .branchCode,

                    branchName:
                      latestBranch
                        .companyName ??
                      latestBranch
                        .location ??
                      latestBranch
                        .branchCode,
                  }
                : null,

            status:
              agent.status,

            sales:
              salesMap.get(
                agent.id
              ) ?? 0,

            commission:
              commissionMap.get(
                agent.id
              ) ?? 0,
          };
        }
      );


    return {
      data,

      page,

      pageSize,

      total,

      totalPages:
        Math.ceil(
          total /
          pageSize
        ),
    };
  };