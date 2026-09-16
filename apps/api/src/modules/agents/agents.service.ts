import prisma from "../../lib/prisma";

import {
  RegisterAgentSchema,
  GetPendingAgentParams,
  GetMasterlistParams,
  GetTransactionParams,
  CheckUniqueInfoParams,
  CheckUniqueInfoResponse,
  TransactionHistParams,
  UpdateAgentAccSchema,
  GetRemainingSalesResponse,
  UpdateAdminAccSchema,
  AgentEditDetails,
  UpdateAgentDetailsPayload,
  RegisterAgentApiPayload,
  ListParams,
  PromotionPayload,
} from "@repo/shared";

import {
  generateTemporaryPassword
} from "./utils/agents.temppass"

import bcrypt from "bcryptjs";
import { AgentLevel, AgentStatus,NotificationType, RecoPromotionStatus } from "../../../generated/prisma";
import { sendAgentApprovalEmail } from "./utils/email.service";

import {
  emitAdminPromotionRecommendation,
  emitAdminReactivationApproval,
  emitUplineReactivationApproval,
} from "../../socket/socketEmitter";
import { formatDateForResponse, normalizeNullableString, parseAgentGender, parseNullableDate, validateAgentLevelChange } from "./helper/agent.helper";
import { sendSmsToGateway } from "../../services/sms/sms.services";
import { AppError } from "../../middleware/appError.middleware";




export const getUniqueInfo = async (
  params: CheckUniqueInfoParams
): Promise<CheckUniqueInfoResponse> => {

  const {
    username,
    email,
    telephone,
  } = params;

  const conditions = [];

  if (username) {
    conditions.push({
      username: {
        equals: username,
        mode: "insensitive" as const,
      },
    });
  }

  if (email) {
    conditions.push({
      email: {
        equals: email,
        mode: "insensitive" as const,
      },
    });
  }

  if (telephone) {
    conditions.push({
      telephone: {
        equals: telephone,
      },
    });
  }

  const existingAgent =
    await prisma.agent.findFirst({
      where: {
        OR: conditions,
      },

      select: {
        username: true,
        email: true,
        telephone: true,
      },
    });

  return {
    usernameExists:
      existingAgent?.username?.toLowerCase() ===
      username?.toLowerCase(),

    emailExists:
      existingAgent?.email?.toLowerCase() ===
      email?.toLowerCase(),

    telephoneExists:
      existingAgent?.telephone ===
      telephone,
  };
};

export const searchAgentsReactivate = async (
  search?: string
) => {
if (!search?.trim()) {
    return [];
  }

  const agents = await prisma.agent.findMany({
    where: {
      fullName: {
        contains: search.trim(),
        mode: "insensitive",
      },

      deletedAt: null,

      status: {
        notIn: [
          "PENDING",
          "REJECTED",
          "ACTIVE",
          "PROBATION",
        ],
      },
    },

    orderBy: {
      fullName: "asc",
    },

    take: 10,
  });

  return agents;
};


export const searchAgents = async (
  search?: string,
) => {
  if (!search?.trim()) {
    return [];
  }

  const agents = await prisma.agent.findMany({
    where: {
      fullName: {
        contains: search.trim(),
        mode: "insensitive",
      },

      deletedAt: null,

      level: {
        in: ["L1", "L2"],
      },

      status: {
        notIn: [
          "PENDING",
          "REJECTED",
          "DROPPED",
          "SUSPENDED",
        ],
      },
    },

    orderBy: {
      fullName: "asc",
    },

    take: 10,
  });

  return agents;
};

export const searchBranchs = async (
  search?: string
) => {

  if (!search) {
    return [];
  }

  const branches =
    await prisma.branch.findMany({

      where: {
        companyName: {
          contains: search,
          mode: "insensitive",
        },

        deletedAt: null,
      },

      take: 10,
    });

  return branches.map((branch) => {

    return {

      branchCode:
        branch.branchCode,

      companyName:
        branch.companyName,

    };
  });
};





export const registerAgent = async (
  payload: RegisterAgentApiPayload,
    profilePhotoPath: string
) => {
  const agentCode =
    payload.agentQrCode?.trim();

  if (!agentCode) {
    throw new Error(
      "Agent QR code is required."
    );
  }

  const username =
    payload.username.trim();

  if (!username) {
    throw new Error(
      "Username is required."
    );
  }

  const now = new Date();

  const isGracePeriod =
    now.getDate() > 12;

  return prisma.$transaction(
    async (tx) => {
      const branch =
        await tx.branch.findUnique({
          where: {
            branchCode:
              payload.branchCode,
          },
          select: {
            branchCode: true,
          },
        });

      if (!branch) {
        throw new Error(
          "Selected branch does not exist."
        );
      }


      const [
        existingUsername,
        existingQR,
      ] = await Promise.all([
        tx.agent.findUnique({
          where: {
            username,
          },
          select: {
            id: true,
          },
        }),

        tx.agent.findUnique({
          where: {
            agentCode,
          },
          select: {
            id: true,
          },
        }),
      ]);

      if (existingUsername) {
        throw new Error(
          "Username already exists."
        );
      }

      if (existingQR) {
        throw new Error(
          "QR Code already exists. Please generate again."
        );
      }

      if (
        payload.selectedAgentLevel ===
        AgentLevel.L1
      ) {
        const l1AgentCount =
          await tx.agentBranch.count({
            where: {
              branchId: branch.branchCode,

              agent: {
                level:
                  AgentLevel.L1,

                status: {
                  in: [
                    AgentStatus.PENDING,
                    AgentStatus.ACTIVE,
                  ],
                },
              },
            },
          });

        if (l1AgentCount >= 10) {
            throw new AppError(
              "This branch has already reached the maximum limit of 10 L1 agents.",
              409
            );
        }
      }

      const agent =
        await tx.agent.create({
          data: {
            agentCode,

            profilePicture:
              profilePhotoPath,

            username,

            fullName:
              payload.agentName
                .trim()
                .toLowerCase()
                .replace(
                  /\b\w/g,
                  (character) =>
                    character.toUpperCase()
                ),

            gender:
              payload.agentGender,

            birthDate:
              payload.dateBirth,

            address:
              payload.agentAdd,

            email:
              payload.email,

            telephone:
              payload.agentTel,

            SecondaryTel:
              payload.agentSecTel,

            status:
              AgentStatus.PENDING,

            level:
              payload.selectedAgentLevel as AgentLevel,

            parentAgentId:
              payload.parentAgentId ||
              null,
          },
        });

      await Promise.all([
        tx.agentBranch.create({
          data: {
            agentId: agent.id,
            branchId: branch.branchCode,
          },
        }),

        tx.agentNotification.create({
          data: {
            agentId: agent.id,

            type:
              NotificationType.AGENT_REGISTRATION,

            title:
              "NEW AGENT",

            message:
              isGracePeriod
                ? "You're now registered as an agent. Your account is currently under grace period. Your first active maintenance cycle will start next month."
                : "You're now registered as an agent. Your maintenance cycle is now active for this month.",
          },
        }),
      ]);

      return {
        agent,
        branch: {
          id: branch.branchCode,
          branchCode:
            branch.branchCode,
        },
      };
    }
  );
};




export const agentTransactions = async ({
  agentId,
  page = 1,
  limit = 10,
}: GetTransactionParams) => {

  const skip =
    (page - 1) * limit;

  const whereCondition = {
    receiverAgentId: agentId,
  };

  const [data, total] =
    await Promise.all([

      prisma.commissionTransaction.findMany({

        where: whereCondition,

        skip,

        take: limit,

        orderBy: {
          createdAt: "desc",
        },

        include: {

          sourceAgent: {
            select: {
              id: true,
              fullName: true,
              level: true,
              agentCode: true,
            },
          },

          receiverAgent: {
            select: {
              id: true,
              fullName: true,
              level: true,
              agentCode: true,
            },
          },

          commissionRule: true,
        },
      }),

      prisma.commissionTransaction.count({
        where: whereCondition,
      }),
    ]);

  return {

    data,

    total,

    page,

    limit,

    totalPages:
      Math.ceil(total / limit),
  };
};


export const agentTransactionsHist = async ({
  agentId,
  limit = 2,
  month,
  year,
}: TransactionHistParams) => {
  const dateFilter: any = {};

  if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    dateFilter.createdAt = {
      gte: startDate,
      lt: endDate,
    };
  }

  const withdrawalDateFilter: any = {};

  if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    withdrawalDateFilter.createdAt = {
      gte: startDate,
      lt: endDate,
    };
  }

  const [commissions, withdrawals] =
    await Promise.all([
      prisma.commissionTransaction.findMany({
        where: {
          receiverAgentId: agentId,
          ...dateFilter,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          sourceAgent: {
            select: {
              id: true,
              fullName: true,
              level: true,
              agentCode: true,
            },
          },
          receiverAgent: {
            select: {
              id: true,
              fullName: true,
              level: true,
              agentCode: true,
            },
          },
          commissionRule: true,
        },
      }),

      prisma.creditWithdrawalRequest.findMany({
        where: {
          agentId,
          ...withdrawalDateFilter,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

  const commissionItems = commissions.map((item) => ({
    id: item.id,
    type: "COMMISSION" as const,
    transactionType: item.commissionType,
    amount: Number(item.commissionAmount),
    status: "COMPLETED",
    remarks: item.remarks,
    createdAt: item.createdAt,

    sourceAgent: item.sourceAgent,
    receiverAgent: item.receiverAgent,

    raw: item,
  }));

  const withdrawalItems = withdrawals.map((item) => ({
    id: item.id,
    type: "WITHDRAWAL" as const,
    transactionType: "GCASH_WITHDRAWAL",
    amount: Number(item.amount),
    status: item.status,
    remarks: item.remarks,
    createdAt: item.createdAt,

    sourceAgent: null,
    receiverAgent: null,

    accountName: item.accountName,
    accountNumber: item.accountNumber,
    payoutChannel: item.payoutChannel,

    raw: item,
  }));

  const merged = [
    ...commissionItems,
    ...withdrawalItems,
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  const data = merged.slice(0, limit);

  return {
    data,
    total: merged.length,
    limit,
    totalPages: Math.ceil(merged.length / limit),
  };
};

export const agentMasterlist = async ({
  page = 1,
  limit = 10,
  search,
  status,
}: GetMasterlistParams) => {
  const skip = (page - 1) * limit;

  const whereCondition = {
    ...(status
      ? {
          status: status as AgentStatus,
        }
      : {
          status: {
            notIn: [
              AgentStatus.PENDING,
              AgentStatus.REJECTED,
            ],
          },
        }),

    ...(search?.trim() && {
      fullName: {
        contains: search.trim(),
        mode: "insensitive" as const,
      },
    }),

  };

  const [data, total] = await Promise.all([
    prisma.agent.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      }
    }),

    prisma.agent.count({
      where: whereCondition,
    }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getAllPendingReg = async ({
  page = 1,
  limit = 10,
  search,
}: GetPendingAgentParams) => {

  const skip =
    (page - 1) * limit;

  const whereCondition = {
    status: "PENDING" as const,

    ...(search && {
      fullName: {
        contains: search,
        mode: "insensitive" as const,
      },
    }),
  };

  const [data, total] =
    await Promise.all([

      prisma.agent.findMany({
        where: whereCondition,

        skip,

        take: limit,

        orderBy: {
          createdAt: "desc",
        },

   
      }),

      prisma.agent.count({
        where: whereCondition,
      }),
    ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(
      total / limit
    ),
  };
};


export const updateAgentRegistration = async (
  agentId: string,
  status: "ACTIVE" | "REJECTED"
) => {
  const now = new Date();

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();

  const isGracePeriod = currentDay > 12;

  const cycleStartDate = new Date(
    currentYear,
    currentMonth - 1,
    1
  );

  const cycleEndDate = new Date(
    currentYear,
    currentMonth,
    0,
    23,
    59,
    59
  );

  const temporaryPassword =
    generateTemporaryPassword(8);

  /*
   * Generate the hash before opening the transaction.
   * This avoids keeping the database transaction open
   * while bcrypt performs CPU-intensive work.
   */
  const hashedPassword = await bcrypt.hash(
    temporaryPassword,
    10
  );

  const result = await prisma.$transaction(
    async (tx) => {
      const agent = await tx.agent.update({
        where: {
          id: agentId,
        },
        data: {
          status,
        },
      });

      let shouldSendApprovalEmail = false;

      if (
        status === "ACTIVE" &&
        ["L1", "L2"].includes(agent.level)
      ) {
        const existingUser =
          await tx.user.findUnique({
            where: {
              agentId: agent.id,
            },
          });

        if (existingUser) {
          /*
           * These operations do not depend on each
           * other's results, so they can run together.
           */
          await Promise.all([
            tx.user.update({
              where: {
                agentId: agent.id,
              },
              data: {
                isActive: true,
              },
            }),

            tx.agentNotification.create({
              data: {
                agentId: agent.id,

                type:
                  NotificationType.REACTIVATION_REQUEST,

                title: "ACCOUNT APPROVED",

                message:
                  "Your account has been reactivated.",
              },
            }),
          ]);
        } else {
          const agentRole =
            await tx.role.findUnique({
              where: {
                name: "AGENT_ACC",
              },
            });

          if (!agentRole) {
            throw new Error(
              "AGENT_ACC role not found"
            );
          }

          /*
           * User creation and notification creation
           * are independent after the role is found.
           */
          await Promise.all([
            tx.user.create({
              data: {
                email: agent.email,

                name: agent.fullName,

                username: agent.username,

                password: hashedPassword,

                isActive: true,

                agentId: agent.id,

                roles: {
                  create: [
                    {
                      roleId: agentRole.id,
                    },
                  ],
                },
              },
            }),

            tx.agentNotification.create({
              data: {
                agentId: agent.id,

                type:
                  NotificationType.AGENT_REGISTRATION,

                title: "ACCOUNT APPROVED",

                message:
                  `Your account has been approved. Username: ${agent.username}`,
              },
            }),
          ]);

          shouldSendApprovalEmail =
            Boolean(agent.email);
        }
      } else {
        await tx.agentNotification.create({
          data: {
            agentId: agent.id,

            type:
              NotificationType.AGENT_REGISTRATION,

            title: "AGENT REGISTERED",

            message:
              "You're now registered as an Agent.",
          },
        });
      }

      /*
       * This keeps your original maintenance-cycle logic:
       * a cycle is created regardless of level/status.
       */
      await tx.agentMaintenanceCycle.create({
        data: {
          agentId: agent.id,

          cycleMonth: currentMonth,

          cycleYear: currentYear,

          cycleStartDate,

          cycleEndDate,

          requiredSales:
            isGracePeriod ? 0 : 1,

          completedSales: 0,

          remainingSales:
            isGracePeriod ? 0 : 1,

          isCompleted: isGracePeriod,

          isFirstCycle: true,

          status:
            isGracePeriod
              ? "GRACE"
              : "ACTIVE",
        },
      });

      const phone =
        agent.telephone ||
        agent.SecondaryTel ||
        null;

      return {
        agent,
        phone,
        shouldSendApprovalEmail,
      };
    }
  );

  /*
   * Email and SMS are external network operations.
   * Run them after the database transaction commits.
   */
  const externalTasks: Promise<unknown>[] = [];

  if (
    result.shouldSendApprovalEmail &&
    result.agent.email
  ) {
    externalTasks.push(
      sendAgentApprovalEmail(
        result.agent.email,
        result.agent.fullName,
        result.agent.username,
        temporaryPassword
      )
    );
  }

  if (result.phone) {
    const smsMessage = `You're now registered as an agent. Your account ${
      isGracePeriod
        ? "is currently under grace period. Your first active maintenance cycle will start next month."
        : "is now active and ready to begin processing sales."
    }

    Please access our website to view your credit points and account details.

    https://jamerogroupofcompanies.site/

    Username: ${result.agent.username}
    Temporary Password: ${temporaryPassword}

    Please log in and change your password after your first login.`;

        externalTasks.push(
          sendSmsToGateway(
            result.phone,
            smsMessage
          )
        );
  }

  /*
   * Email and SMS run simultaneously instead of
   * waiting for one before starting the other.
   */
  if (externalTasks.length > 0) {
    await Promise.all(externalTasks);
  }

  return result.agent;
};


export const droppedOrSuspendedAgentService = async (
  agentId: string,
  status: "DROPPED" | "SUSPENDED"
) => {
  return prisma.$transaction(async (tx) => {

    const agent =
      await tx.agent.update({
        where: {
          id: agentId,
        },
        data: {
          status,
        },
      });

    await tx.user.update({
      where: {
        agentId: agent.id,
      },
      data: {
        isActive: false,
      },
    });

    const isDropped =
      status === "DROPPED";

    await tx.agentNotification.create({
      data: {
        agentId: agent.id,

        type: isDropped
          ? NotificationType.MAINTENANCE_DROPPED
          : NotificationType.MAINTENANCE_SUSPENDED,

        title: isDropped
          ? "ACCOUNT DROPPED"
          : "ACCOUNT SUSPENDED",

        message: isDropped
          ? `Your account has been dropped. Username: ${agent.username}`
          : `Your account has been suspended. Username: ${agent.username}`,
      },
    });

    return agent;
  });
};


export const getAgentDetails = async (
  agentId: string
) => {
  const currentDate = new Date();

  const currentMonth =
    currentDate.getMonth() + 1;

  const currentYear =
    currentDate.getFullYear();

  const agent =
    await prisma.agent.findUnique({
      where: {
        id: agentId,
      },

      include: {
        /* =========================================
           PARENT
        ========================================= */
        parentAgent: {
          select: {
            id: true,
            fullName: true,
            level: true,
            agentCode: true,
          },
        },

        /* =========================================
           DIRECT DOWNLINES

           L1 -> direct L2 agents
           L2 -> direct L3 agents

           Also retrieve each direct downline's
           downlines so an L1 can receive its L3
           descendants.
        ========================================= */
        downlines: {
          select: {
            id: true,
            fullName: true,
            level: true,
            status: true,

            downlines: {
              select: {
                id: true,
                fullName: true,
                level: true,
                status: true,
              },

              orderBy: {
                fullName: "asc",
              },
            },
          },

          orderBy: {
            fullName: "asc",
          },
        },

        /* =========================================
           COMMISSIONS
        ========================================= */
        commissionsEarned: {
          include: {
            sourceAgent: {
              select: {
                fullName: true,
                level: true,
              },
            },

            commissionRule: true,
          },

          orderBy: {
            createdAt: "desc",
          },
        },

        /* =========================================
           CURRENT MAINTENANCE
        ========================================= */
        maintenanceCycles: {
          where: {
            cycleMonth: currentMonth,
            cycleYear: currentYear,
          },

          orderBy: {
            createdAt: "desc",
          },

          take: 1,
        },

        /* =========================================
           NOTIFICATIONS
        ========================================= */
        notifications: {
          orderBy: {
            createdAt: "desc",
          },

          take: 20,
        },
      },
    });

  if (!agent) {
    throw new Error("Agent not found");
  }

  /*
   * Remove the nested `downlines` property from
   * every direct downline.
   */
  const directDownlines =
    agent.downlines.map(
      ({
        downlines: nestedDownlines,
        ...downline
      }) => downline
    );

  /*
   * Only an L1 agent needs the indirect L3 agents.
   *
   * L1
   * ├── L2
   * │   ├── L3
   * │   └── L3
   * └── L2
   *     └── L3
   */
  const indirectL3Downlines =
    agent.level === "L1"
      ? agent.downlines.flatMap(
          (level2Agent) =>
            level2Agent.downlines
        )
      : [];

  /*
   * L1 gets L2 + L3.
   * L2 gets only its direct L3 agents.
   * L3 normally gets no downlines.
   */
  const combinedDownlines =
    agent.level === "L1"
      ? [
          ...directDownlines,
          ...indirectL3Downlines,
        ]
      : directDownlines;

  /*
   * Optional protection against duplicate agents.
   */
  const uniqueDownlines = Array.from(
    new Map(
      combinedDownlines.map((downline) => [
        downline.id,
        downline,
      ])
    ).values()
  ).sort((first, second) =>
    first.fullName.localeCompare(
      second.fullName
    )
  );

  return {
    ...agent,

    /*
     * Override Prisma's nested result with the
     * flattened response expected by the frontend.
     */
    downlines: uniqueDownlines,
  };
};

export const readAllNotif = async (
  agentId: string
) => {
  const result = await prisma.agentNotification.updateMany({
    where:{
      agentId,
      isRead:false,
    },
    data: {
      isRead: true,
    },
  });

  return result;
}


export const updateAgentAccountService =
  async (
    userId: number,
    payload: UpdateAgentAccSchema
  ) => {

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          agent: true,
        },
      });

    if (!user) {
      throw new Error(
        "USER_NOT_FOUND"
      );
    }

    if (!user.agentId) {
      throw new Error(
        "AGENT_NOT_FOUND"
      );
    }

    const updateUserData: any = {};

    const updateAgentData: any = {};

    if (payload.email) {
      updateUserData.email =
        payload.email;

      updateAgentData.email =
        payload.email;
    }

    if (payload.agentTel) {
      updateAgentData.telephone =
        payload.agentTel;
    }

    if (
      payload.password &&
      payload.password.trim() !== ""
    ) {
      updateUserData.password =
        await bcrypt.hash(
          payload.password,
          10
        );
    }

    return prisma.$transaction(
      async (tx) => {

        await tx.user.update({
          where: {
            id: userId,
          },
          data: updateUserData,
        });

        const agent =
          await tx.agent.update({
            where: {
              id: user.agentId!,
            },
            data: updateAgentData,
          });



        return agent;
      }
    );
  };


export const updateAdminAccountService =
  async (
    userId: number,
    payload: UpdateAdminAccSchema
  ) => {
    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
        },
      });

    if (!user) {
      throw new Error(
        "USER_NOT_FOUND"
      );
    }

    const updateUserData: {
      email?: string;
      password?: string;
    } = {};

    if (payload.email?.trim()) {
      updateUserData.email =
        payload.email.trim();
    }

    if (
      payload.password?.trim()
    ) {
      updateUserData.password =
        await bcrypt.hash(
          payload.password,
          10
        );
    }

    if (
      Object.keys(updateUserData).length === 0
    ) {
      throw new Error(
        "NO_FIELDS_TO_UPDATE"
      );
    }

    return prisma.user.update({
      where: {
        id: userId,
      },
      data: updateUserData,
      select: {
        id: true,
        email: true,
        username: true,
      },
    });
  };


export const getAgentRemainingSales = async (
  agentId: string
): Promise<GetRemainingSalesResponse> => {

  const agent =
    await prisma.agent.findUnique({
      where: {
        id: agentId,
      },

      select: {
        id: true,
        status: true,
      },
    });

  if (!agent) {
    throw new Error(
      "Agent not found"
    );
  }

  if (agent.status === "ACTIVE") {

    const activeCycle =
      await prisma.agentMaintenanceCycle.findFirst({
        where: {
          agentId: agent.id,
          status: "ACTIVE",
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return {
      status: agent.status,
      remainingSales:
        activeCycle?.remainingSales ?? 0,
    };
  }

  if (agent.status === "PROBATION") {

    const probationRequest =
      await prisma.agentReactivationRequest.findFirst({
        where: {
          agentId: agent.id,

          status: "PROBATION",
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    if (!probationRequest) {
      return {
        status: agent.status,
        remainingSales: 0,
      };
    }

    return {
      status: agent.status,

      remainingSales:
        Math.max(
          probationRequest.requiredSales -
          probationRequest.completedSales,
          0
        ),
    };
  }

  return {
    status: agent.status,
    remainingSales: 0,
  };
};





// Edit Agent 

export async function getAgentEditDetailsService(
  agentId: string
): Promise<AgentEditDetails> {
  const agent =
    await prisma.agent.findUnique({
      where: {
        id:
          agentId,
      },

      select: {
        id:
          true,

        fullName:
          true,

        agentCode:
          true,

        level:
          true,

        status:
          true,

        gender:
          true,

        birthDate:
          true,

        address:
          true,

        email:
          true,

        telephone:
          true,

        SecondaryTel:
          true,

        user: {
          select: {
            username:
              true,
          },
        },
      },
    });

  if (!agent) {
    throw new Error(
      "Agent not found."
    );
  }

  return {
    id:
      agent.id,

    fullName:
      agent.fullName,

    agentCode:
      agent.agentCode,

    username:
      agent.user?.username ??
      null,

    level:
      agent.level,

    status:
      agent.status,

    gender:
      parseAgentGender(
        agent.gender
      ),

    birthDate:
      formatDateForResponse(
        agent.birthDate
      ),

    address:
      agent.address,

    email:
      agent.email,

    telephone:
      agent.telephone,

    secondaryTel:
      agent.SecondaryTel,
  };
}


// export async function updateAgentDetailsService(
//   agentId: string,
//   payload: UpdateAgentDetailsPayload
// ): Promise<AgentEditDetails> {
//   const fullName =
//     payload.fullName.trim();

//   const username =
//     normalizeNullableString(
//       payload.username
//     );

//   const email =
//     normalizeNullableString(
//       payload.email
//     );

//   const telephone =
//     normalizeNullableString(
//       payload.telephone
//     );

//   const secondaryTel =
//     normalizeNullableString(
//       payload.secondaryTel
//     );

//   const address =
//     normalizeNullableString(
//       payload.address
//     );

//   if (!fullName) {
//     throw new Error(
//       "Agent full name is required."
//     );
//   }

//   if (
//     !Object.values(
//       AgentLevel
//     ).includes(
//       payload.level as AgentLevel
//     )
//   ) {
//     throw new Error(
//       "Invalid agent level."
//     );
//   }

//   if (
//     !Object.values(
//       AgentStatus
//     ).includes(
//       payload.status as AgentStatus
//     )
//   ) {
//     throw new Error(
//       "Invalid agent status."
//     );
//   }

//   const requestedLevel =
//     payload.level as AgentLevel;

//   const gender =
//     parseAgentGender(
//       payload.gender
//     );

//   const existingAgent =
//     await prisma.agent.findUnique({
//       where: {
//         id: agentId,
//       },

//       select: {
//         id: true,
//         level: true,
//         parentAgentId: true,
//       },
//     });

//   if (!existingAgent) {
//     throw new Error(
//       "Agent not found."
//     );
//   }

//   /*
//    * Enforce:
//    *
//    * L1 -> L1 only
//    * L2 -> L2 or L1
//    * L3 -> L3 or L2
//    */
//   validateAgentLevelChange(
//     existingAgent.level,
//     requestedLevel
//   );

//   if (username) {
//     const existingUsername =
//       await prisma.user.findFirst({
//         where: {
//           username,

//           NOT: {
//             agentId:
//               existingAgent.id,
//           },
//         },

//         select: {
//           id: true,
//         },
//       });

//     if (existingUsername) {
//       throw new Error(
//         "Username is already in use."
//       );
//     }
//   }

//   if (email) {
//     const existingEmail =
//       await prisma.agent.findFirst({
//         where: {
//           email,

//           NOT: {
//             id: agentId,
//           },
//         },

//         select: {
//           id: true,
//         },
//       });

//     if (existingEmail) {
//       throw new Error(
//         "Email is already assigned to another agent."
//       );
//     }
//   }

//   const isLevelChanged =
//     existingAgent.level !==
//     requestedLevel;

//   const isPromotedToL1 =
//     existingAgent.level ===
//       AgentLevel.L2 &&
//     requestedLevel ===
//       AgentLevel.L1;

//   const isPromotedToL2 =
//     existingAgent.level ===
//       AgentLevel.L3 &&
//     requestedLevel ===
//       AgentLevel.L2;

//   await prisma.$transaction(
//     async (tx) => {
//       /*
//        * Promoted L1 and L2 agents must no longer
//        * have their previous parent/upline.
//        */
//       const newParentAgentId =
//         isPromotedToL1 ||
//         isPromotedToL2
//           ? null
//           : existingAgent.parentAgentId;

//       await tx.agent.update({
//         where: {
//           id: agentId,
//         },

//         data: {
//           fullName,

//           level:
//             requestedLevel,

//           status:
//             payload.status as AgentStatus,

//           gender,

//           birthDate:
//             parseNullableDate(
//               payload.birthDate
//             ),

//           address,
//           email,
//           telephone,

//           SecondaryTel:
//             secondaryTel,

//           parentAgentId:
//             newParentAgentId,
//         },
//       });

//       /*
//        * When an L2 becomes L1, its direct L3
//        * downlines become L2.
//        *
//        * They remain assigned to the newly
//        * promoted L1 agent.
//        */
//       if (isPromotedToL1) {
//         await tx.agent.updateMany({
//           where: {
//             parentAgentId:
//               agentId,

//             level:
//               AgentLevel.L3,
//           },

//           data: {
//             level:
//               AgentLevel.L2,
//           },
//         });
//       }

//       /*
//        * Keep the linked user account username
//        * synchronized when a user account exists.
//        */
//       if (username) {
//         const linkedUser =
//           await tx.user.findUnique({
//             where: {
//               agentId:
//                 existingAgent.id,
//             },

//             select: {
//               id: true,
//             },
//           });

//         if (linkedUser) {
//           await tx.user.update({
//             where: {
//               agentId:
//                 existingAgent.id,
//             },

//             data: {
//               username,
//             },
//           });
//         }
//       }
//     }
//   );

//   return getAgentEditDetailsService(
//     agentId
//   );
// }



export async function updateAgentDetailsService(
  agentId: string,
  payload: UpdateAgentDetailsPayload
): Promise<AgentEditDetails> {
  const fullName =
    payload.fullName.trim();

  const username =
    normalizeNullableString(
      payload.username
    );

  const email =
    normalizeNullableString(
      payload.email
    );

  const telephone =
    normalizeNullableString(
      payload.telephone
    );

  const secondaryTel =
    normalizeNullableString(
      payload.secondaryTel
    );

  const address =
    normalizeNullableString(
      payload.address
    );

  if (!fullName) {
    throw new Error(
      "Agent full name is required."
    );
  }

  if (
    !Object.values(
      AgentLevel
    ).includes(
      payload.level as AgentLevel
    )
  ) {
    throw new Error(
      "Invalid agent level."
    );
  }

 

  const requestedLevel =
    payload.level as AgentLevel;


  const gender =
    parseAgentGender(
      payload.gender
    );

  const existingAgent =
    await prisma.agent.findUnique({
      where: {
        id: agentId,
      },

      select: {
        id: true,
        level: true,
        parentAgentId: true,
      },
    });

  if (!existingAgent) {
    throw new Error(
      "Agent not found."
    );
  }

  validateAgentLevelChange(
    existingAgent.level,
    requestedLevel
  );

  const isPromotedToL1 =
    existingAgent.level ===
      AgentLevel.L2 &&
    requestedLevel ===
      AgentLevel.L1;

  const isPromotedToL2 =
    existingAgent.level ===
      AgentLevel.L3 &&
    requestedLevel ===
      AgentLevel.L2;

  /*
   * Validate the selected new upline when an
   * L3 agent is promoted to L2.
   */
  let validatedNewUplineId:
    string | null =
      existingAgent.parentAgentId;

  if (isPromotedToL2) {
    if (!payload.newUplineId) {
      throw new Error(
        "A new L1 upline is required when promoting an L3 agent to L2."
      );
    }

    if (
      payload.newUplineId ===
      agentId
    ) {
      throw new Error(
        "An agent cannot be assigned as their own upline."
      );
    }

    const newUpline =
      await prisma.agent.findUnique({
        where: {
          id:
            payload.newUplineId,
        },

        select: {
          id: true,
          level: true,
          status: true,
        },
      });

    if (!newUpline) {
      throw new Error(
        "Selected upline was not found."
      );
    }

    if (
      newUpline.level !==
      AgentLevel.L1
    ) {
      throw new Error(
        "The selected upline must be an L1 agent."
      );
    }

    if (
      newUpline.status !==
      AgentStatus.ACTIVE
    ) {
      throw new Error(
        "The selected upline must be active."
      );
    }

    validatedNewUplineId =
      newUpline.id;
  }

  const [
    existingUsername,
    existingEmail,
  ] = await Promise.all([
    username
      ? prisma.user.findFirst({
          where: {
            username,

            NOT: {
              agentId:
                existingAgent.id,
            },
          },

          select: {
            id: true,
          },
        })
      : Promise.resolve(null),

    email
      ? prisma.agent.findFirst({
          where: {
            email,

            NOT: {
              id: agentId,
            },
          },

          select: {
            id: true,
          },
        })
      : Promise.resolve(null),
  ]);

  if (existingUsername) {
    throw new Error(
      "Username is already in use."
    );
  }

  if (existingEmail) {
    throw new Error(
      "Email is already assigned to another agent."
    );
  }

  await prisma.$transaction(
    async (tx) => {
      /*
       * L2 -> L1:
       * Remove the promoted agent's current upline.
       *
       * L3 -> L2:
       * Assign the selected active L1 as the new upline.
       *
       * No level change:
       * Preserve the current parent.
       */
      const nextParentAgentId =
        isPromotedToL1
          ? null
          : isPromotedToL2
            ? validatedNewUplineId
            : existingAgent.parentAgentId;

      await tx.agent.update({
        where: {
          id: agentId,
        },

        data: {
          fullName,

          ...(username
            ? {
                username,
              }
            : {}),

          level:
            requestedLevel,


          gender,

          birthDate:
            parseNullableDate(
              payload.birthDate
            ),

          address,
          email,
          telephone,

          SecondaryTel:
            secondaryTel,

          parentAgentId:
            nextParentAgentId,
        },
      });

      /*
       * When an L2 becomes L1, promote its direct
       * L3 downlines to L2.
       *
       * They remain under this newly promoted L1.
       */
      if (isPromotedToL1) {
        await tx.agent.updateMany({
          where: {
            parentAgentId:
              agentId,

            level:
              AgentLevel.L3,
          },

          data: {
            level:
              AgentLevel.L2,
          },
        });
      }

      /*
       * Synchronize the username of the linked
       * user account when one exists.
       */
      if (username) {
        const linkedUser =
          await tx.user.findUnique({
            where: {
              agentId:
                existingAgent.id,
            },

            select: {
              id: true,
            },
          });

        if (linkedUser) {
          await tx.user.update({
            where: {
              agentId:
                existingAgent.id,
            },

            data: {
              username,
            },
          });
        }
      }
    }
  );

  return getAgentEditDetailsService(
    agentId
  );
}


export const getAgentPromotionRecommendationsService =
  async ({
    page = 1,
    limit = 10,
    search,
    status,
  }: ListParams) => {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.max(limit, 1);

    const skip =
      (safePage - 1) * safeLimit;

    const where = {
      ...(status &&
      status !== "ALL"
        ? {
            status:
              status as
                | "PENDING"
                | "PROMOTED"
                | "REJECTED",
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                agent: {
                  fullName: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },

              {
                agent: {
                  agentCode: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },

              {
                remarks: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] =
      await prisma.$transaction([
        prisma.agentRecomForPromotion.findMany({
          where,

          skip,

          take: safeLimit,

          orderBy: {
            createdAt: "desc",
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

            submittedByUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),

        prisma.agentRecomForPromotion.count({
          where,
        }),
      ]);

    return {
      data,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages:
        Math.ceil(
          total / safeLimit
        ),
    };
  };




export const updateRecomProm = async (
  recomId: string,
  payload: PromotionPayload
) => {
  const existingRecom =
    await prisma.agentRecomForPromotion.findUnique({
      where: {
        id: recomId,
      },

      select: {
        id: true,
        status: true,

        agent: {
          select: {
            id: true,
            agentCode: true,
            level: true,
            status: true,
            parentAgentId: true,
          },
        },
      },
    });

  if (!existingRecom) {
    throw new Error(
      "Recommendation promotion not found."
    );
  }

  if (
    existingRecom.status !==
    RecoPromotionStatus.PENDING
  ) {
    throw new Error(
      "This recommendation has already been processed."
    );
  }

  if (
    !Object.values(AgentLevel).includes(
      payload.PromotedTo as AgentLevel
    )
  ) {
    throw new Error(
      "Invalid agent level."
    );
  }

  const requestedLevel =
    payload.PromotedTo as AgentLevel;

  validateAgentLevelChange(
    existingRecom.agent.level,
    requestedLevel
  );

  const isPromotedToL1 =
    existingRecom.agent.level ===
      AgentLevel.L2 &&
    requestedLevel ===
      AgentLevel.L1;

  const isPromotedToL2 =
    existingRecom.agent.level ===
      AgentLevel.L3 &&
    requestedLevel ===
      AgentLevel.L2;

  let validatedNewUplineId:
    | string
    | null =
    existingRecom.agent.parentAgentId;

  /*
   * L3 -> L2 requires a new active L1 upline.
   */
  if (isPromotedToL2) {
    if (!payload.newUplineId) {
      throw new Error(
        "A new L1 upline is required when promoting an L3 agent to L2."
      );
    }

    // IMPORTANT:
    // Compare IDs, not agentCode.
    if (
      payload.newUplineId ===
      existingRecom.agent.id
    ) {
      throw new Error(
        "An agent cannot be assigned as their own upline."
      );
    }

    const newUpline =
      await prisma.agent.findUnique({
        where: {
          id: payload.newUplineId,
        },

        select: {
          id: true,
          agentCode: true,
          fullName: true,
          level: true,
          status: true,
        },
      });

    if (!newUpline) {
      throw new Error(
        "Selected upline was not found."
      );
    }

    if (
      newUpline.level !== AgentLevel.L1
    ) {
      throw new Error(
        "The selected upline must be an L1 agent."
      );
    }

    if (
      newUpline.status !== AgentStatus.ACTIVE
    ) {
      throw new Error(
        "The selected upline must be active."
      );
    }

    validatedNewUplineId =
      newUpline.id;
  }

  return prisma.$transaction(
    async (tx) => {
      /*
       * L2 -> L1
       * Remove current parent.
       *
       * L3 -> L2
       * Assign selected L1.
       */
      const nextParentAgentId =
        isPromotedToL1
          ? null
          : isPromotedToL2
          ? validatedNewUplineId
          : existingRecom.agent
              .parentAgentId;

      const updatedAgent =
        await tx.agent.update({
          where: {
            // FIXED
            id: existingRecom.agent.id,
          },

          data: {
            level: requestedLevel,

            parentAgentId:
              nextParentAgentId,
          },

          select: {
            id: true,
            agentCode: true,
            fullName: true,
            level: true,
            parentAgentId: true,
          },
        });

      /*
       * L2 -> L1:
       *
       * Existing direct L3 children become L2.
       *
       * They remain under this agent because
       * parentAgentId already points to this
       * agent's ID.
       */
      if (isPromotedToL1) {
        await tx.agent.updateMany({
          where: {
            // FIXED
            parentAgentId:
              existingRecom.agent.id,

            level: AgentLevel.L3,
          },

          data: {
            level: AgentLevel.L2,
          },
        });
      }

      const updatedRecommendation =
        await tx.agentRecomForPromotion.update({
          where: {
            id: recomId,
          },

          data: {
            status:
              RecoPromotionStatus.PROMOTED,
          },
        });

      return {
        recommendation:
          updatedRecommendation,

        agent: updatedAgent,
      };
    }
  );
};



export const rejectRecomPromotion = async (
  RecomId: string,
  remarks: string
) => {
  const existingRecom =
    await prisma.agentRecomForPromotion.findUnique({
      where: {
        id: RecomId,
      },
    });

  if (!existingRecom) {
    throw new Error(
      "Recommendation promotion not found."
    );
  }

  if (
    existingRecom.status !==
    RecoPromotionStatus.PENDING
  ) {
    throw new Error(
      "Only pending recommendations can be rejected."
    );
  }

  const rejectionRemarks =
    remarks?.trim();

  if (!rejectionRemarks) {
    throw new Error(
      "Rejection reason is required."
    );
  }

  const rejectedRecommendation =
    await prisma.agentRecomForPromotion.update({
      where: {
        id: RecomId,
      },
      data: {
        status:
          RecoPromotionStatus.REJECTED,

        remarks:
          rejectionRemarks,
      },
      include: {
        agent: {
          select: {
            id: true,
            agentCode: true,
            fullName: true,
            level: true,
          },
        },
      },
    });

  return rejectedRecommendation;
};





// Function to fetch agent transaction in agent webpage account 

export const getAgentMonthlyTransactionCounts = async (
  agentId: string,
  year?: number
) => {
  const targetYear =
    year ?? new Date().getFullYear();

  const agent =
    await prisma.agent.findUnique({
      where: {
        id: agentId,
      },
      select: {
        id: true,
        fullName: true,
        agentCode: true,
        level: true,
      },
    });

  if (!agent) {
    throw new Error(
      "Agent not found."
    );
  }

  const startOfYear =
    new Date(
      targetYear,
      0,
      1
    );

  const startOfNextYear =
    new Date(
      targetYear + 1,
      0,
      1
    );

  const transactions =
    await prisma.commissionTransaction.findMany({
      where: {
        receiverAgentId:
          agentId,

        createdAt: {
          gte: startOfYear,
          lt: startOfNextYear,
        },
      },

      select: {
        createdAt: true,
      },
    });

  const counts =
    Array(12).fill(0);

  for (
    const transaction of
    transactions
  ) {
    const monthIndex =
      transaction.createdAt.getMonth();

    counts[monthIndex] += 1;
  }

  const monthlyTransactions =
    counts.map(
      (count, index) => ({
        month: index + 1,

        label:
          new Date(
            targetYear,
            index,
            1
          ).toLocaleString(
            "en-US",
            {
              month: "long",
            }
          ),

        count,
      })
    );

  const totalTransactions =
    counts.reduce(
      (
        total,
        count
      ) => total + count,
      0
    );

  return {
    agent,
    year:
      targetYear,

    totalTransactions,

    monthlyTransactions,
  };
};



// Agent Recommendation Button from Upline Downlines 

export const createPromotionRecommendationService = async (
  agentId: string,
  submittedByUserId: number,
  remarks?: string
) => {
  const agent = await prisma.agent.findUnique({
    where: {
      id: agentId,
    },
    select: {
      id: true,
      fullName: true,
      agentCode: true,
      level: true,
      status: true,
    },
  });

  if (!agent) {
    throw new Error("Agent not found.");
  }

  const existingRecommendation =
    await prisma.agentRecomForPromotion.findFirst({
      where: {
        agentId,
        status: RecoPromotionStatus.PENDING,
      },
    });

  if (existingRecommendation) {
    throw new Error(
      "This agent already has a pending promotion recommendation."
    );
  }

  const recommendation =
    await prisma.agentRecomForPromotion.create({
      data: {
        agentId,
        submittedByUserId,
        remarks: remarks?.trim() || null,
        status: RecoPromotionStatus.PENDING,
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

        submittedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

  emitAdminPromotionRecommendation({
    recommendationId:
      recommendation.id,

    agentId:
      recommendation.agent.id,

    agentName:
      recommendation.agent.fullName,

    agentCode:
      recommendation.agent.agentCode,

    level:
      recommendation.agent.level,

    status:
      recommendation.status,

    createdAt:
      recommendation.createdAt,
  });

  return recommendation;
};