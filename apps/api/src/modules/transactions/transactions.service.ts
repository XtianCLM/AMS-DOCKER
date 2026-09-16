import {TransacListParams } from "@repo/shared";
import prisma from "../../lib/prisma";


const getPagination = (page = 1, limit = 10) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || 10, 1);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};
export const getAdminReactivationPaymentsService = async ({
  page = 1,
  limit = 10,
  search,
  status,
}: TransacListParams) => {
  const pagination = getPagination(page, limit);

  const where: any = {
    ...(status && status !== "ALL"
      ? {
          status,
        }
      : {}),

    ...(search
      ? {
          OR: [
            {
              agent: {
                fullName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              agent: {
                agentCode: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              xenditReferenceId: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              xenditPaymentSessionId: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const [payments, total] = await prisma.$transaction([
    prisma.agentReactivationPayment.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      include: {
        agent: {
          select: {
            id: true,
            fullName: true,
            agentCode: true,
            level: true,
          },
        },
        request: {
          select: {
            id: true,
            status: true,
            requestType: true,
            requestedAt: true,
          },
        },
      },
    }),

    prisma.agentReactivationPayment.count({
      where,
    }),
  ]);

  const paymentIds = payments.map((payment) => payment.id);

  const expenses =
    paymentIds.length > 0
      ? await prisma.companyExpenseLog.findMany({
          where: {
            sourceType: "REACTIVATION_PAYMENT",
            sourceId: {
              in: paymentIds,
            },
          },
        })
      : [];

  const expensesBySourceId = expenses.reduce<
    Record<string, typeof expenses>
  >((acc, expense) => {
    if (!expense.sourceId) return acc;

    if (!acc[expense.sourceId]) {
      acc[expense.sourceId] = [];
    }

    acc[expense.sourceId].push(expense);

    return acc;
  }, {});

  const data = payments.map((payment) => {
    const companyExpenses =
      expensesBySourceId[payment.id] ?? [];

    const companyExpenseTotal =
      companyExpenses.reduce(
        (total, expense) =>
          total + Number(expense.amount),
        0
      );

    return {
      ...payment,
      companyExpenses,
      companyExpenseTotal,
    };
  });

  return {
    data,
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.ceil(total / pagination.limit),
  };
};


export const getAdminWithdrawalsService = async ({
  userId,
  page = 1,
  limit = 10,
  search,
  status,
}: TransacListParams) => {
    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          username: true,

          roles: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },

          branchId: true
        },
      });

    if (!user) {
      throw new Error(
        "Authenticated user not found."
      );
    }

    const seeAllRoles =
      new Set<string>([
        "ADMIN",
        "OPERATIONS",
        "BOD_ADMIN",
        "DEV",
      ]);

    const canSeeAllTransactions =
      user.roles.some(({ role }) =>
        seeAllRoles.has(role.name)
      );

    const userBranchCode =
      user.branchId;

    if (
      !canSeeAllTransactions &&
      !userBranchCode
    ) {
      throw new Error(
        "The logged-in user is not assigned to a branch."
      );
    }

    const pagination =
      getPagination(page, limit);

    const normalizedSearch =
      search?.trim() ?? "";


  const where: any = {
     ...(!canSeeAllTransactions
          ? {
              commissionScan: {
                is: {
                  branchId:
                   user.branchId,
                },
              },
            }
          : {}),
    ...(status && status !== "ALL"
      ? {
          status,
        }
      : {}),

    ...(search
      ? {
          OR: [
            {
              accountName: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              accountNumber: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              payoutChannel: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              xenditExternalId: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              xenditDisbursementId: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              agent: {
                fullName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              agent: {
                agentCode: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };

  const [withdrawals, total] = await prisma.$transaction([
    prisma.creditWithdrawalRequest.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          requestedAt: "desc",
        },
      ],
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

    prisma.creditWithdrawalRequest.count({
      where,
    }),
  ]);

  const withdrawalIds = withdrawals.map(
    (withdrawal) => withdrawal.id
  );

  const expenses =
    withdrawalIds.length > 0
      ? await prisma.companyExpenseLog.findMany({
          where: {
            sourceType: "WITHDRAWAL",
            sourceId: {
              in: withdrawalIds,
            },
          },
        })
      : [];

  const expensesBySourceId = expenses.reduce<
    Record<string, typeof expenses>
  >((acc, expense) => {
    if (!expense.sourceId) return acc;

    if (!acc[expense.sourceId]) {
      acc[expense.sourceId] = [];
    }

    acc[expense.sourceId].push(expense);

    return acc;
  }, {});

  const data = withdrawals.map((withdrawal) => {
    const companyExpenses =
      expensesBySourceId[withdrawal.id] ?? [];

    const companyExpenseTotal =
      companyExpenses.reduce(
        (total, expense) =>
          total + Number(expense.amount),
        0
      );

    return {
      ...withdrawal,
      companyExpenses,
      companyExpenseTotal,
    };
  });

  return {
    data,
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.ceil(total / pagination.limit),
  };
};
