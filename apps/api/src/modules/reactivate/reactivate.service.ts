// // services/reactivation.service.ts

// import  prisma  from "../../lib/prisma";

// const SELF_REACTIVATION_LIMIT_DAYS = 90;

// function getDaysFromExpiredAt(expiredAt: Date) {
//   const now = new Date();

//   const diffMs =
//     now.getTime() - expiredAt.getTime();

//   return Math.floor(
//     diffMs / (1000 * 60 * 60 * 24)
//   );
// }

// export async function checkSelfReactivationEligibility(
//   userId: number
// ) {
//   const user = await prisma.user.findUnique({
//     where: {
//       id: userId,
//     },
//     select: {
//       agentId: true,
//     },
//   });

//   if (!user) {
//     throw new Error("User not found.");
//   }

//   if (!user.agentId) {
//     throw new Error("User is not linked to an agent.");
//   }

//   const agent = await prisma.agent.findUnique({
//     where: {
//       id: user.agentId,
//     },
//   });

//   if (!agent) {
//     throw new Error("Agent not found.");
//   }

//   if (agent.status !== "EXPIRED") {
//     return {
//       eligible: false,
//       agentStatus: agent.status,
//       message:
//         "Only expired agents can request reactivation.",
//     };
//   }

//   const latestExpiredCycle =
//     await prisma.agentMaintenanceCycle.findFirst({
//       where: {
//         agentId: agent.id,
//         status: "EXPIRED",
//         expiredAt: {
//           not: null,
//         },
//       },
//       orderBy: {
//         expiredAt: "desc",
//       },
//     });

//   if (!latestExpiredCycle?.expiredAt) {
//     return {
//       eligible: false,
//       agentStatus: agent.status,
//       message:
//         "No expired maintenance cycle found.",
//     };
//   }

//   const daysExpired = getDaysFromExpiredAt(
//     latestExpiredCycle.expiredAt
//   );

//   const remainingDays =
//     SELF_REACTIVATION_LIMIT_DAYS - daysExpired;

//   const eligible =
//     daysExpired >= 0 &&
//     daysExpired <= SELF_REACTIVATION_LIMIT_DAYS;

//   return {
//     eligible,
//     agentStatus: agent.status,
//     expiredAt: latestExpiredCycle.expiredAt,
//     daysExpired,
//     remainingDays:
//       remainingDays > 0 ? remainingDays : 0,
//     phase: eligible
//       ? "SELF_REACTIVATION"
//       : "NOT_ELIGIBLE",
//     message: eligible
//       ? "Agent is eligible for self reactivation."
//       : "Self reactivation period has already expired.",
//   };
// }

// export async function selfReactivateAgent(
//   userId: number
// ) {
//   const eligibility =
//     await checkSelfReactivationEligibility(
//       userId
//     );

//   if (!eligibility.eligible) {
//     throw new Error(eligibility.message);
//   }

//    const user = await prisma.user.findUnique({
//         where: {
//         id: userId,
//         },
//         select: {
//         agentId: true,
//         },
//     });


//     if (!user) {
//             throw new Error("User not found.");
//         }

//     if (!user.agentId) {
//             throw new Error("User is not linked to an agent.");
//         }

//     const agent = await prisma.agent.findUnique({
//             where: {
//             id: user.agentId,
//             },
//         });

//         if (!agent) {
//             throw new Error("Agent not found.");
//         }


//   const now = new Date();

//   const currentMonth =
//     now.getMonth() + 1;

//   const currentYear =
//     now.getFullYear();

//   return prisma.$transaction(async (tx) => {
//     await tx.agent.update({
//       where: {
//         id: agent.id,
//       },
//       data: {
//         status: "ACTIVE",
//       },
//     });

//     const existingActiveCycle =
//       await tx.agentMaintenanceCycle.findFirst({
//         where: {
//           agentId:agent.id,
//           cycleMonth: currentMonth,
//           cycleYear: currentYear,
//         },
//       });

//     if (!existingActiveCycle) {
//       await tx.agentMaintenanceCycle.create({
//         data: {
//           agentId:agent.id,
//           cycleMonth: currentMonth,
//           cycleYear: currentYear,
//           cycleStartDate: new Date(
//             currentYear,
//             currentMonth - 1,
//             1
//           ),
//           cycleEndDate: new Date(
//             currentYear,
//             currentMonth,
//             0
//           ),
//           requiredSales: 1,
//           completedSales: 0,
//           remainingSales: 1,
//           isCompleted: false,
//           status: "ACTIVE",
//         },
//       });
//     }

//     const notification =
//       await tx.agentNotification.create({
//         data: {
//           agentId:agent.id,
//           type: "MAINTENANCE_REACTIVATE",
//           title: "Account Reactivated",
//           message:
//             "Your agent account has been successfully reactivated.",
//         },
//       });

//     return {
//       message:
//         "Agent account reactivated successfully.",
//       notification,
//     };
//   });
// }


import prisma from "../../lib/prisma";
import { NotificationType, NotificationActionType, ActionResult, ReactivationRequestStatus  } from "../../../generated/prisma";

import {
  Prisma,
} from "@prisma/client";
import { emitAdminPaymentUpdated, emitAdminReactivationApproval, emitBranchReactivationApproval, emitNotification, emitUplineReactivationApproval } from "../../socket/socketEmitter";
import { ReactivationRequestDetailsResponse, ReviewReactivationApprovalPayload } from "@repo/shared";
import { sendSmsToGateway } from "../../services/sms/sms.services";

const SELF_REACTIVATION_LIMIT_DAYS = 90;
const ADMIN_REACTIVATION_LIMIT_DAYS = 180;
const MAX_SLOT = 10;


function getDaysFromDateAt(
  dateAt: Date
) {
  const now = new Date();

  const diffMs =
    now.getTime() -
    dateAt.getTime();

  return Math.floor(
    diffMs /
      (1000 * 60 * 60 * 24)
  );
}
function getDaysUntil(date: Date) {
  const now = new Date();

  const diffMs = date.getTime() - now.getTime();

  return Math.ceil(
    diffMs / (1000 * 60 * 60 * 24)
  );
}
function getProbationDays(
  probationStartedAt: Date,
  probationEndAt: Date
) {
  const diffMs =
    probationEndAt.getTime() -
    probationStartedAt.getTime();

  return Math.floor(
    diffMs / (1000 * 60 * 60 * 24)
  );
}



async function validateReactivationSlot(
  tx: Prisma.TransactionClient,
  agent: {
    id: string;
    level: "L1" | "L2" | "L3";
    parentAgentId: string | null;
  }
) {
  if (agent.level === "L1") {
    const branches =
      await tx.agentBranch.findMany({
        where: {
          agentId: agent.id,
          isActive: true,
        },
      });

    if (branches.length === 0) {
      throw new Error(
        "Reactivation failed. Agent has no active branch assignment."
      );
    }

    for (const branch of branches) {
      const activeL1Count =
        await tx.agentBranch.count({
          where: {
            branchId: branch.branchId,
            isActive: true,
            agent: {
              id: {
                not: agent.id,
              },
              level: "L1",
              status: "ACTIVE",
              deletedAt: null,
            },
          },
        });

      if (activeL1Count >= MAX_SLOT) {
        throw new Error(
          "Reactivation failed. The branch you are assigned to does not have an available L1 slot."
        );
      }
    }

    return;
  }

  if (!agent.parentAgentId) {
    throw new Error(
      "Reactivation failed. Agent has no parent agent assigned."
    );
  }

  const activeDownlineCount =
    await tx.agent.count({
      where: {
        parentAgentId:
          agent.parentAgentId,
        id: {
          not: agent.id,
        },
        status: "ACTIVE",
        deletedAt: null,
      },
    });

  if (activeDownlineCount >= MAX_SLOT) {
    throw new Error(
      "Reactivation failed. Your assigned parent agent does not have an available downline slot."
    );
  }
}
export async function checkSelfReactivationEligibility(userId: number) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      agentId: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (!user.agentId) {
    throw new Error("User is not linked to an agent.");
  }

  const agent = await prisma.agent.findUnique({
    where: {
      id: user.agentId,
    },
    select: {
      id: true,
      status: true,
      level: true,
      parentAgentId: true,
    },
  });


  if (!agent) {
    throw new Error("Agent not found.");
  }

  

  if (agent.status === "ACTIVE") {
    return {
      eligible: false,
      agentStatus: agent.status,
      phase: "NOT_EXPIRED",
      message: "Only expired agents can request reactivation.",
    };
  }

  const now = new Date();

  const latestExpiredCycle = await prisma.agentMaintenanceCycle.findFirst({
    where: {
      agentId: agent.id,
      status: "EXPIRED",
      expiredAt: {
        not: null,
      },
    },
    orderBy: {
      expiredAt: "desc",
    },
  });

  if (!latestExpiredCycle?.expiredAt) {
    return {
      eligible: false,
      agentStatus: agent.status,
      phase: "NO_EXPIRED_CYCLE",
      message: "No expired maintenance cycle found.",
    };
  }

  const daysExpired = getDaysFromDateAt(latestExpiredCycle.expiredAt);

  const selfReactivationRemainingDays = Math.max(
    SELF_REACTIVATION_LIMIT_DAYS - daysExpired,
    0
  );

  const adminReactivationRemainingDays = Math.max(
    ADMIN_REACTIVATION_LIMIT_DAYS - daysExpired,
    0
  );

  const withinSelfReactivationPeriod =
    daysExpired >= 0 && daysExpired <= SELF_REACTIVATION_LIMIT_DAYS;

  const withinAdminReactivationPeriod =
    daysExpired > SELF_REACTIVATION_LIMIT_DAYS &&
    daysExpired <= ADMIN_REACTIVATION_LIMIT_DAYS;

  // const shouldAutoDeactivate = daysExpired > ADMIN_REACTIVATION_LIMIT_DAYS;



  const activeReactivationRequest =
    await prisma.agentReactivationRequest.findFirst({
      where: {
        agentId: agent.id,
        status: {
          in: ["PENDING", "PROBATION"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
  const daysProbation =
    activeReactivationRequest?.status === "PROBATION" &&
    activeReactivationRequest.probationStartedAt
      ? getDaysFromDateAt(
          activeReactivationRequest.probationStartedAt
        )
      : 0;

  const remainingProbation =
    activeReactivationRequest?.status === "PROBATION" &&
    activeReactivationRequest.probationStartedAt &&
    activeReactivationRequest.probationEndsAt
      ? Math.max(
          getProbationDays(
            activeReactivationRequest.probationStartedAt,
            activeReactivationRequest.probationEndsAt
          ) - daysProbation,
          0
        )
      : 0;

  if (activeReactivationRequest) {
    return {
      eligible: false,
      agentStatus: agent.status,
      daysExpired,
      daysProbation,
      remainingProbation,
      remainingDays: withinSelfReactivationPeriod
        ? selfReactivationRemainingDays
        : adminReactivationRemainingDays,
      phase:
        activeReactivationRequest.status === "PROBATION"
          ? "PROBATION_PERIOD"
          : "PENDING_REQUEST",
      message:
        activeReactivationRequest.status === "PROBATION"
          ? "Complete your probationary period to successfully reactivate your account."
          : "You already have a pending reactivation request.",
    };
  }

  const latestFailedRequest = await prisma.agentReactivationRequest.findFirst({
    where: {
      agentId: agent.id,
      status: "FAILED",
      cooldownUntil: {
        not: null,
      },
    },
    orderBy: {
      failedAt: "desc",
    },
  });

  const cooldownDays = latestFailedRequest?.cooldownUntil
    ? Math.max(
        getDaysUntil(
          latestFailedRequest.cooldownUntil
        ),
        0
      )
    : 0;
  if (
    latestFailedRequest?.cooldownUntil &&
    latestFailedRequest.cooldownUntil > now
  ) {
    return {
      eligible: false,
      agentStatus: agent.status,
      phase: "COOLDOWN_PERIOD",
      daysExpired,
      cooldownDays, 
      remainingDays: withinSelfReactivationPeriod
        ? selfReactivationRemainingDays
        : adminReactivationRemainingDays,
      cooldownUntil: latestFailedRequest.cooldownUntil,
      message:
        "You must wait until your cooldown period is complete before requesting reactivation again.",
    };
  }

  // if (shouldAutoDeactivate) {
  //   await prisma.agent.update({
  //     where: {
  //       id: agent.id,
  //     },
  //     data: {
  //       status: "DEACTIVATED",
  //     },
  //   });

  //   return {
  //     eligible: false,
  //     agentStatus: "DEACTIVATED",
  //     expiredAt: latestExpiredCycle.expiredAt,
  //     daysExpired,
  //     remainingDays: 0,
  //     phase: "AUTOMATIC_DEACTIVATION",
  //     message:
  //       "Your account has been automatically deactivated because the reactivation period has ended.",
  //   };
  // }

  if (withinAdminReactivationPeriod) {
    return {
      eligible: false,
      agentStatus: agent.status,
      expiredAt: latestExpiredCycle.expiredAt,
      daysExpired,
      remainingDays: adminReactivationRemainingDays,
      phase: "REACTIVATION_VIA_ADMIN",
      message:
        "The self-reactivation window has ended. You may now request reactivation through admin approval.",
    };
  }

  if (!withinSelfReactivationPeriod) {
    return {
      eligible: false,
      agentStatus: agent.status,
      expiredAt: latestExpiredCycle.expiredAt,
      daysExpired,
      remainingDays: 0,
      phase: "INVALID_REACTIVATION_PERIOD",
      message: "Invalid reactivation period.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await validateReactivationSlot(tx, agent);
    });
  } catch (error) {
    return {
      eligible: false,
      agentStatus: agent.status,
      expiredAt: latestExpiredCycle.expiredAt,
      daysExpired,
      remainingDays: selfReactivationRemainingDays,
      phase: "NO_SLOT_AVAILABLE",
      message:
        error instanceof Error
          ? error.message
          : "No slot available for reactivation.",
    };
  }

  return {
    eligible: true,
    agentStatus: agent.status,
    expiredAt: latestExpiredCycle.expiredAt,
    daysExpired,
    remainingDays: selfReactivationRemainingDays,
    phase: "SELF_REACTIVATION",
    message: "Agent is eligible for self reactivation.",
  };
}

export async function selfReactivateAgent(
  userId: number
) {
  const eligibility =
    await checkSelfReactivationEligibility(
      userId
    );

  if (!eligibility.eligible) {
    throw new Error(
      eligibility.message
    );
  }

  const now = new Date();

  const probationEndsAt =
        new Date(now);

  probationEndsAt.setDate(
        probationEndsAt.getDate() + 30
        );


  return prisma.$transaction(
    async (tx) => {
      const user =
        await tx.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            agentId: true,
          },
        });

      if (!user) {
        throw new Error(
          "User not found."
        );
      }

      if (!user.agentId) {
        throw new Error(
          "User is not linked to an agent."
        );
      }

      const agent =
        await tx.agent.findUnique({
          where: {
            id: user.agentId,
          },
          select: {
            id: true,
            status: true,
            level: true,
            parentAgentId: true,
          },
        });

      if (!agent) {
        throw new Error(
          "Agent not found."
        );
      }

      if (agent.status !== "EXPIRED") {
        throw new Error(
          "Only expired agents can reactivate."
        );
      }

      await validateReactivationSlot(
        tx,
        agent
      );


      const existingActiveReactivation =
        await tx.agentReactivationRequest.findFirst(
          {
            where: {
              agentId: agent.id,
              status: "PROBATION"
            },
          }
        );

       
        if (!existingActiveReactivation) {

        await tx.agent.update({
          where: {
            id: agent.id,
          },
          data: {
            status: "PROBATION",
          },
        });

        await tx.agentReactivationRequest.create({
            data: {
            agentId: agent.id,

            submittedBranchCode: "EMB-MAIN",

            requestType:
                "SELF_REACTIVATION",

            probationStartedAt:
                now,

            probationEndsAt,

            requiredSales: 1,

            completedSales: 0,

            isCompleted: false,

            status: "PROBATION",
            },
        });
        }

    //   const notification =
    //     await tx.agentNotification.create({
    //       data: {
    //         agentId: agent.id,
    //         type: "MAINTENANCE_REACTIVATE",
    //         title:
    //           "Account Reactivated",
    //         message:
    //           "Your agent account has been successfully reactivated.",
    //       },
    //     });

    const notification =
        await tx.agentNotification.create({
          data: {
            agentId: agent.id,
            type: "MAINTENANCE_PROBATION",
            title:
              "Account Reactivation",
            message:
              "Complete your probationary period successfully to regain active status.",
          },
        });

      return {
        message:
          "Complete your probationary period successfully to regain active status.",
        notification,
      };
    }
  );
}



export const submitAdminReactivationRequestService =
  async (
    userId: number,
    file: Express.Multer.File
  ) => {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        agent: true,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    if (!user.agentId || !user.agent) {
      throw new Error(
        "User is not linked to an agent."
      );
    }

    const agent = user.agent;

    if (agent.status !== "EXPIRED") {
      throw new Error(
        "Only expired agents can request admin reactivation."
      );
    }

    if (!file) {
      throw new Error(
        "Formal written reactivation request file is required."
      );
    }

    const parentAcc = agent.parentAgentId
      ? await prisma.user.findFirst({
          where: {
            agentId: agent.parentAgentId,
          },
          include: {
            agent: true,
          },
        })
      : null;

    const existingActiveRequest =
      await prisma.agentReactivationRequest.findFirst({
        where: {
          agentId: agent.id,
          requestType: "ADMIN_APPROVAL",
          status: {
            in: [
              "PENDING",
              "PROBATION",
            ],
          },
        },
      });

    if (existingActiveRequest) {
      throw new Error(
        "You already have an active admin reactivation request."
      );
    }

    return prisma.$transaction(async (tx) => {
      const request =
        await tx.agentReactivationRequest.create({
          data: {
            agentId: agent.id,
            requestType: "ADMIN_APPROVAL",
            submittedBranchCode: "EMB-MAIN",
            status: "PENDING",
            reason:
              "Formal written reactivation request submitted for admin approval.",

            attachments: {
              create: {
                fileName: file.originalname,
                filePath: `/uploads/reactivation-requests/${file.filename}`,
                fileType: file.mimetype,
                fileSize: file.size,
              },
            },

            approvals: {
              create: [
                ...(agent.parentAgentId
                  ? [
                      {
                        reviewerUserId:
                          parentAcc?.id,
                        reviewerType:
                          "UPLINE_AGENT" as const,
                        reviewerAgentId:
                          agent.parentAgentId,
                        status:
                          "PENDING" as const,
                        approvalOrder: 1,
                        isRequired: true,
                      },
                    ]
                  : []),

                {
                  reviewerType:
                    "ADMIN" as const,
                  status:
                    "PENDING" as const,
                  approvalOrder:
                    agent.parentAgentId ? 2 : 1,
                  isRequired: true,
                },
              ],
            },
          },

          include: {
            attachments: true,
            approvals: true,
          },
        });

      const adminApproval =
        request.approvals.find(
          (approval) =>
            approval.reviewerType === "ADMIN"
        );

      const uplineApproval =
        request.approvals.find(
          (approval) =>
            approval.reviewerType === "UPLINE_AGENT"
        );

      /**
       * If request has upline approval:
       * notify only the upline first.
       */
      if (
        uplineApproval &&
        uplineApproval.reviewerAgentId
      ) {
        emitUplineReactivationApproval(
          uplineApproval.reviewerAgentId,
          {
            requestId: request.id,
            approvalId: uplineApproval.id,
            agentId: agent.id,
            agentName: agent.fullName,
            reviewerType: "UPLINE_AGENT",
            title: "New Reactivation Approval",
            message: `${agent.fullName} submitted a reactivation request requiring your approval.`,
            createdAt: new Date(),
          }
        );
      }

      /**
       * If request has no upline approval:
       * notify admin immediately.
       */
      if (
        !uplineApproval &&
        adminApproval
      ) {
        emitAdminReactivationApproval({
          requestId: request.id,
          approvalId: adminApproval.id,
          agentId: agent.id,
          agentName: agent.fullName,
          reviewerType: "ADMIN",
          title: "New Reactivation Approval",
          message: `${agent.fullName} submitted a reactivation request for admin approval.`,
          createdAt: new Date(),
        });
      }

      await tx.agentNotification.create({
        data: {
          agentId: agent.id,
          type:
            NotificationType.REACTIVATION_REQUEST,
          title:
            "ADMIN REACTIVATION REQUEST SUBMITTED",
          entityId: request.id,
          message:
            "Your formal written reactivation request has been submitted and is waiting for approval.",
        },
      });

      return request;
    });
  };

export const submitReactivationRequestService = async (
  userId: number,
  agentCode: string,
  file: Express.Multer.File
) => {
  const normalizedAgentCode =
    agentCode?.trim();

  if (!normalizedAgentCode) {
    throw new Error("Agent code is required.");
  }

  if (!file) {
    throw new Error(
      "Formal written reactivation request file is required."
    );
  }

  const [submittingUser, agent] =
    await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          username: true,
          roles: {
            include: {
              role: true,
            },
          },
          branch:{
            select:{
              branchCode:true
            }
          }
        },
      }),

      prisma.agent.findFirst({
        where: {
          agentCode: normalizedAgentCode,
        },
      }),
    ]);

  if (!submittingUser) {
    throw new Error(
      "Submitting user was not found."
    );
  }


  if (!agent) {
    throw new Error("Agent was not found.");
  }

  const allowedRoles = [
    "BRANCH_ACC",
  ];

  const canSubmit =
    submittingUser.roles.some(
      (userRole) =>
        allowedRoles.includes(
          userRole.role.name
        )
    );

  if (!canSubmit) {
    throw new Error(
      "You are not allowed to submit reactivation requests."
    );
  }

  if (agent.status !== "EXPIRED") {
    throw new Error(
      "Only expired agents can request reactivation."
    );
  }

  const existingActiveRequest =
    await prisma.agentReactivationRequest.findFirst({
      where: {
        agentId: agent.id,
        requestType: "ADMIN_APPROVAL",
        status: {
          in: [
            "PENDING",
            "PROBATION",
          ],
        },
      },
      select: {
        id: true,
      },
    });

  if (existingActiveRequest) {
    throw new Error(
      "This agent already has an active reactivation request."
    );
  }

  const result =
    await prisma.$transaction(
      async (tx) => {
        const request =
          await tx.agentReactivationRequest.create({
            data: {
              agentId: agent.id,
              submittedByUserId: submittingUser.id,
              submittedBranchCode: submittingUser.branch?.branchCode,
              requestType:
                "ADMIN_APPROVAL",
              status: "PENDING",
              reason:
                "Formal written reactivation request submitted for admin approval.",

              /*
               * Add this field only if it exists
               * in your Prisma model.
               */
              // submittedByUserId:
              //   submittingUser.id,

              attachments: {
                create: {
                  fileName:
                    file.originalname,
                  filePath:
                    `/uploads/reactivation-requests/${file.filename}`,
                  fileType:
                    file.mimetype,
                  fileSize:
                    file.size,
                },
              },

              /*
               * Only one approval is created:
               * ADMIN approval.
               */
              approvals: {
                create: {
                  reviewerType:
                    "ADMIN",
                  reviewerUserId:
                    null,
                  reviewerAgentId:
                    null,
                  status:
                    "PENDING",
                  approvalOrder: 1,
                  isRequired: true,
                },
              },
            },

            include: {
              attachments: true,
              approvals: true,
            },
          });

        const adminApproval =
          request.approvals.find(
            (approval) =>
              approval.reviewerType ===
              "ADMIN"
          );

        if (!adminApproval) {
          throw new Error(
            "Admin approval record was not created."
          );
        }

        const notification =
          await tx.agentNotification.create({
            data: {
              agentId:
                agent.id,
              type:
                NotificationType.REACTIVATION_REQUEST,
              title:
                "REACTIVATION REQUEST SUBMITTED",
              entityId:
                request.id,
              message:
                "Your formal written reactivation request has been submitted and is waiting for admin approval.",
            },
          });

        return {
          request,
          adminApproval,
          notification,
        };
      }
    );

  /*
   * Emit socket events only after
   * the transaction succeeds.
   */
  emitAdminReactivationApproval({
    requestId:
      result.request.id,
    approvalId:
      result.adminApproval.id,
    agentId:
      agent.id,
    agentName:
      agent.fullName,
    reviewerType:
      "ADMIN",
    title:
      "New Reactivation Approval",
    message:
      `${submittingUser.username} submitted a reactivation request for ${agent.fullName}.`,
    createdAt:
      new Date(),
  });

  emitNotification(
    result.notification.agentId,
    {
      id:
        result.notification.id,
      title:
        result.notification.title,
      message:
        result.notification.message,
      type:
        result.notification.type,
      isRead:
        result.notification.isRead,
      createdAt:
        result.notification.createdAt,
    }
  );

  return result.request;
};

export const getMyReactivationApprovalsService =
  async (
    userId: number,
    {
      page = 1,
      limit = 5,
      search,
      status,
    }: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    }
  ) => {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        agent: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    const isAdmin = user.roles.some(({ role }) =>
      ["ADMIN", "OPERATIONS", "BRANCH_ACC"].includes(role.name)
    );

    const searchCondition = search?.trim()
      ? {
          request: {
            agent: {
              OR: [
                {
                  fullName: {
                    contains: search.trim(),
                    mode: "insensitive" as const,
                  },
                },
                {
                  agentCode: {
                    contains: search.trim(),
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          },
        }
      : {};

    const statusCondition = status
      ? {
          status: status as "PENDING" | "APPROVED" | "REJECTED",
        }
      : {};

    const accessCondition = {
      OR: [
        ...(isAdmin
          ? [
              {
                reviewerType: "ADMIN" as const,
              },
            ]
          : []),

        ...(user.agentId
          ? [
              {
                reviewerType: "UPLINE_AGENT" as const,
                reviewerAgentId: user.agentId,
              },
            ]
          : []),
      ],
    };

    const whereCondition = {
      ...statusCondition,
      ...accessCondition,
      ...searchCondition,
    };

    const allData =
      await prisma.agentReactivationApproval.findMany({
        where: whereCondition,
        include: {
          request: {
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
              attachments: true,
              approvals: {
                where: {
                  isRequired: true,
                },
                orderBy: {
                  approvalOrder: "asc",
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const filteredData = allData.filter((approval) => {
      if (approval.reviewerType !== "ADMIN") {
        return true;
      }

      const previousRequiredApprovals =
        approval.request.approvals.filter(
          (item) =>
            item.approvalOrder < approval.approvalOrder
        );

      return previousRequiredApprovals.every(
        (item) => item.status === "APPROVED"
      );
    });

    const total = filteredData.length;

    const data = filteredData.slice(
      (page - 1) * limit,
      page * limit
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  };


export const rejectReactivationApprovalService = async (
  userId: number,
  payload: {
    approvalId: string;
    status: "REJECTED";
    remarks?: string;
  }
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
      agent: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }


  const approval =
    await prisma.agentReactivationApproval.findUnique({
      where: {
        id: payload.approvalId,
      },
      include: {
        request: {
          include: {
            agent: true,
            submittedBranch:{
              select:{
                branchCode:true,
                companyName: true
              }
            }
          },
          
        },
      },
    });

  if (!approval) {
    throw new Error("Approval request not found.");
  }

  if (approval.status !== "PENDING") {
    throw new Error(
      "This approval request has already been reviewed."
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();

    const updatedApproval =
      await tx.agentReactivationApproval.update({
        where: {
          id: approval.id,
        },
        data: {
          status: "REJECTED",
          remarks: payload.remarks,
          reviewedAt: now,

          ...(approval.reviewerType === "ADMIN" && {
            reviewerUserId: user.id,
          }),
        },
      });

    const request =
      await tx.agentReactivationRequest.update({
        where: {
          id: approval.requestId,
        },
        data: {
          status: "FAILED",
          requiredSales: 0,
          failedAt: now,
          remarks:
            payload.remarks ??
            "Reactivation request rejected.",
        },
      });

    await tx.agentReactivationApproval.updateMany({
      where: {
        requestId: approval.requestId,
        id: {
          not: approval.id,
        },
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
        remarks:
          approval.reviewerType === "UPLINE_AGENT"
            ? "Auto-rejected because the upline agent rejected the request."
            : "Auto-rejected because the admin rejected the request.",
        reviewedAt: now,
      },
    });

    const notification =
      await tx.agentNotification.create({
        data: {
          agentId: approval.request.agentId,
          type: NotificationType.REACTIVATION_REQUEST,
          title: "REACTIVATION REQUEST REJECTED",
          message:
            approval.reviewerType === "UPLINE_AGENT"
              ? "Your upline agent rejected your reactivation request."
              : "Your admin rejected your reactivation request.",
        },
      });

    return {
      approvalId: updatedApproval.id,
      requestId: request.id,
      approvalStatus: updatedApproval.status,
      requestStatus: request.status,
      notifications: [notification],

      branchSocketPayload:
        approval.request.submittedBranchCode
          ? {
              branchCode:
                approval.request.submittedBranchCode,
              payload: {
                requestId: request.id,
                approvalId: updatedApproval.id,
                branchCode:
                  approval.request.submittedBranchCode,
                agentId: approval.request.agentId,
                agentName:
                  approval.request.agent.fullName,
                reviewerType: "ADMIN" as const,
                status: "REJECTED" as const,
                title: "Reactivation Request Rejected",
                message: `${approval.request.agent.fullName}'s reactivation request was rejected.`,
                createdAt: now,
              },
            }
          : null,

      adminPaymentPayload: null,
    };
  });

  for (const notification of result.notifications) {
    emitNotification(notification.agentId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      entityId: notification.entityId,
      actionType: notification.actionType,
      actionResult: notification.actionResult,
    });
  }

  if (result.branchSocketPayload) {
    emitBranchReactivationApproval(
      result.branchSocketPayload.branchCode,
      result.branchSocketPayload.payload
    );
  }

  return {
    approvalId: result.approvalId,
    requestId: result.requestId,
    approvalStatus: result.approvalStatus,
    requestStatus: result.requestStatus,
  };
};



export const adminReactivationApprovalService = async (
  userId: number,
  payload: ReviewReactivationApprovalPayload
) => {
  let probationStartDate: Date | null = null;
  let probationEndDate: Date | null = null;
  let requiredSales: number | null = null;

  /*
   * Validate approval conditions before
   * opening the database transaction.
   */
  if (payload.status === "APPROVED") {
    requiredSales = Number(payload.requiredSales);

    if (
      !Number.isInteger(requiredSales) ||
      requiredSales <= 0
    ) {
      throw new Error(
        "Required sales must be a positive whole number."
      );
    }

    if (
      !payload.probationStartDate ||
      !payload.probationEndDate
    ) {
      throw new Error(
        "Probation start and end dates are required."
      );
    }

    probationStartDate = new Date(
      `${payload.probationStartDate}T00:00:00.000Z`
    );

    probationEndDate = new Date(
      `${payload.probationEndDate}T23:59:59.999Z`
    );

    if (
      Number.isNaN(probationStartDate.getTime()) ||
      Number.isNaN(probationEndDate.getTime())
    ) {
      throw new Error(
        "Invalid probation dates."
      );
    }

    if (
      probationEndDate <
      probationStartDate
    ) {
      throw new Error(
        "Probation end date cannot be earlier than the start date."
      );
    }

    if (!payload.remarks?.trim()) {
      throw new Error(
        "Approval remarks are required."
      );
    }
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
      agent: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  // const isAdmin = user.roles.some(
  //   (userRole) => userRole.role.name === "ADMIN"
  // );

  

  if (!user) {
    throw new Error("User not found.");
  }

  const allowedRoles = [
    "ADMIN",
    "OPERATIONS",
  ];

  const isAllowed = user.roles.some(
    (userRole) =>
      allowedRoles.includes(
        userRole.role.name
      )
  );

  if (!isAllowed) {
    throw new Error(
      "Only Admin or Operations can review this request."
    );
  }

 const approval =
    await prisma.agentReactivationApproval.findUnique({
      where: {
        id: payload.approvalId,
      },
      include: {
        request: {
          include: {
            agent: true,
            submittedBranch:{
              select:{
                branchCode:true,
                companyName: true
              }
            }
          },
          
        },
      },
    });

  if (!approval) {
    throw new Error(
      "Approval request not found."
    );
  }

  if (approval.status !== "PENDING") {
    throw new Error(
      "This approval request has already been reviewed."
    );
  }

  if (approval.reviewerType !== "ADMIN") {
    throw new Error(
      "This approval is not an admin approval."
    );
  }

  const result =
    await prisma.$transaction(
      async (tx) => {
        const now = new Date();

        const updatedApproval =
          await tx.agentReactivationApproval.update({
            where: {
              id: approval.id,
            },
            data: {
              reviewerUserId: user.id,
              status: payload.status,
              remarks:
                payload.remarks?.trim() ||
                null,
              reviewedAt: now,
            },
          });

        /*
         * REJECT
         */
        if (payload.status === "REJECTED") {
          const request =
            await tx.agentReactivationRequest.update({
              where: {
                id: approval.requestId,
              },
              data: {
                status:
                  ReactivationRequestStatus.FAILED,
                failedAt: now,
                remarks:
                  payload.remarks?.trim() ||
                  "Reactivation request rejected.",
              },
            });

          const notification =
            await tx.agentNotification.create({
              data: {
                agentId:
                  approval.request.agentId,
                type:
                  NotificationType.REACTIVATION_REQUEST,
                title:
                  "REACTIVATION REQUEST REJECTED",
                entityId:
                  request.id,
                message:
                  payload.remarks?.trim()
                    ? `Your reactivation request was rejected. Remarks: ${payload.remarks.trim()}`
                    : "Your reactivation request has been rejected.",
              },
            });


        const smsMessage = payload.remarks?.trim()
          ? `Your reactivation request was rejected. Remarks: ${payload.remarks.trim()}`
          : "Your reactivation request has been rejected.";

        return {
          approvalId:
            updatedApproval.id,

          requestId:
            request.id,

          approvalStatus:
            updatedApproval.status,

          requestStatus:
            request.status,

          notifications: [
            notification,
          ],

          sms: {
            number: approval.request.agent.telephone,
            message: smsMessage,
          },


          branchPayload:
            approval.request.submittedBranchCode
              ? {
                  branchCode:
                    approval.request.submittedBranchCode,

                  payload: {
                    requestId:
                      request.id,

                    approvalId:
                      updatedApproval.id,

                    branchCode:
                      approval.request.submittedBranchCode,

                    agentId:
                      approval.request.agentId,

                    agentName:
                      approval.request.agent.fullName,

                    reviewerType:
                      "ADMIN" as const,

                    status:
                      "REJECTED" as const,

                    title:
                      "Reactivation Request Rejected",

                    message:
                      `${approval.request.agent.fullName}'s reactivation request was rejected.`,

                    createdAt:
                      now,
                  },
                }
              : null,
        };
        }

        /*
         * APPROVE
         *
         * These values are guaranteed to be
         * non-null because they were validated
         * above when status is APPROVED.
         */
        if (
          requiredSales === null ||
          probationStartDate === null ||
          probationEndDate === null
        ) {
          throw new Error(
            "Approval conditions are incomplete."
          );
        }

        const request =
          await tx.agentReactivationRequest.update({
            where: {
              id: approval.requestId,
            },
            data: {
              status:
                ReactivationRequestStatus.PROBATION,

              approvedAt: now,

              requiredSales,

              probationStartedAt:
                probationStartDate,

              probationEndsAt:
                probationEndDate,

              remarks:
                payload.remarks!.trim(),
            },
          });
          

        await tx.agent.update({
          where: {
            id:  approval.request.agentId,
          },
          data: {
            status: "PROBATION",
          },
        });

        const notification =
          await tx.agentNotification.create({
            data: {
              agentId:
                approval.request.agentId,

              type:
                NotificationType.REACTIVATION_REQUEST,

              title:
                "REACTIVATION APPROVED",

              entityId:
                request.id,

              message:
                `Your reactivation request has been approved. ` +
                `You must complete ${requiredSales} sale${
                  requiredSales > 1 ? "s" : ""
                } during the probation period from ` +
                `${payload.probationStartDate} to ${payload.probationEndDate}. `,
            },
          });

          const smsMessage =
          `Your reactivation request has been approved. ` +
          `Complete ${requiredSales} sale${
            requiredSales > 1 ? "s" : ""
          } from ${payload.probationStartDate} to ${payload.probationEndDate}.`;

         return {
            approvalId: updatedApproval.id,
            requestId: approval.requestId,
            approvalStatus: updatedApproval.status,
            requestStatus: approval.request.status,
            notifications: [notification,],

            sms: {
              number: approval.request.agent.telephone,
              message: smsMessage,
            },

            branchSocketPayload:
            approval.request.submittedBranchCode
              ? {
                  branchCode:
                    approval.request.submittedBranchCode,

                  payload: {
                    requestId:
                      approval.requestId,

                    approvalId:
                      updatedApproval.id,

                    branchCode:
                      approval.request.submittedBranchCode,

                    agentId:
                      approval.request.agentId,

                    agentName:
                      approval.request.agent.fullName,

                    reviewerType:
                      "ADMIN" as const,

                    status:
                      "APPROVED" as const,

                    title:
                      "Reactivation Request Approved",

                    message:
                      `${approval.request.agent.fullName}'s reactivation request was approved.`,

                    createdAt:
                      now,
                  },
                }
              : null,
          };
      }
    );

  /*
   * Emit socket notifications only after
   * the transaction succeeds.
   */
  for (
    const notification of
    result.notifications
  ) {
    emitNotification(
      notification.agentId,
      {
        id:
          notification.id,
        title:
          notification.title,
        message:
          notification.message,
        type:
          notification.type,
        isRead:
          notification.isRead,
        createdAt:
          notification.createdAt,
        entityId:
          notification.entityId,
        actionType:
          notification.actionType,
        actionResult:
          notification.actionResult,
      }
    );
  }


  if (result.sms?.number) {
    try {
      await sendSmsToGateway(
        result.sms.number,
        result.sms.message
      );
    } catch (err) {
      console.error("Failed to send SMS:", err);
      // Don't throw here.
      // The approval has already been committed successfully.
    }
  }
  
  if (result.branchSocketPayload) {
    emitBranchReactivationApproval(
      result.branchSocketPayload.branchCode,
      result.branchSocketPayload.payload
    ); 
  }
  

  return {
    approvalId:
      result.approvalId,
    requestId:
      result.requestId,
    approvalStatus:
      result.approvalStatus,
    requestStatus:
      result.requestStatus,
  };
};

export const getReactivationRequestDetailsService =
  async (
    requestId: string
  ): Promise<ReactivationRequestDetailsResponse> => {
    if (!requestId?.trim()) {
      throw new Error(
        "Request ID is required."
      );
    }

    const request =
      await prisma.agentReactivationRequest.findUnique({
        where: {
          id: requestId.trim(),
        },

        select: {
          id: true,
          requiredSales: true,
          probationStartedAt: true,
          probationEndsAt: true,

          agent: {
            select: {
              id: true,
              agentCode: true,
              fullName: true,
              status: true,
            },
          },

          approvals: {
            where: {
              reviewerType: "ADMIN",
            },

            take: 1,

            select: {
              id: true,
              status: true,
              remarks: true,
              reviewedAt: true,

              reviewerUser: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                },
              },
            },
          },
        },
      });

    if (!request) {
      throw new Error(
        "Reactivation request not found."
      );
    }

    const approval =
      request.approvals[0] ?? null;

    return {
      requestId: request.id,

      agent: {
        id: request.agent.id,
        agentCode:
          request.agent.agentCode,
        fullName:
          request.agent.fullName,
        status:
          request.agent.status,
      },

      requiredSales:
        request.requiredSales,

      probationStartDate:
        request.probationStartedAt
          ? request.probationStartedAt.toISOString()
          : null,

      probationEndDate:
        request.probationEndsAt
          ? request.probationEndsAt.toISOString()
          : null,

      approval: approval
        ? {
            id: approval.id,
            status: approval.status,
            remarks: approval.remarks,

            reviewedAt:
              approval.reviewedAt
                ? approval.reviewedAt.toISOString()
                : null,

            reviewer:
              approval.reviewerUser
                ? {
                    id:
                      approval.reviewerUser.id,
                    name:
                      approval.reviewerUser.name,
                    username:
                      approval.reviewerUser.username,
                  }
                : null,
          }
        : null,
    };
  };

export const getMyReactivationApprovalProgressService = async (
  userId: number,
  requestId: string
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      agent: true,
    },
  });

  if (!user?.agent) {
    throw new Error("Agent account not found.");
  }

  const request =
    await prisma.agentReactivationRequest.findFirst({
      where: {
        id: requestId,
        agentId: user.agent.id,
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
        approvals: {
          orderBy: {
            approvalOrder: "asc",
          },
          include: {
            reviewerUser: {
              select: {
                id: true,
                name: true,
              },
            },
            reviewerAgent: {
              select: {
                id: true,
                fullName: true,
                agentCode: true,
                level: true,
              },
            },
          },
        },
      },
    });

  if (!request) {
    throw new Error("Reactivation request not found.");
  }

  return {
    requestId: request.id,
    requestStatus: request.status,
    requestedAt: request.requestedAt,
    approvedAt: request.approvedAt,
    failedAt: request.failedAt,
    remarks: request.remarks,
    agent: request.agent,
    approvals: request.approvals,
  };
};