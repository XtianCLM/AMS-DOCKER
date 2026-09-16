import {   ClientStatus, NotificationType, ReactivationRequestStatus, ReactivationType } from "../../generated/prisma";
import prisma from "../lib/prisma";
import { sendSmsToGateway } from "../services/sms/sms.services";
import {
  emitNotification,
} from "../socket/socketEmitter";
import { sendDownlineEmail, sendExpiringAgentEmail } from "./maintenance.helper";


function getDaysFromExpiredAt(expiredAt: Date) {
  const now = new Date();

  const diffMs =
    now.getTime() - expiredAt.getTime();

  return Math.floor(
    diffMs / (1000 * 60 * 60 * 24)
  );
}

type ProbationResult = {
  notification: {
    id: string;
    agentId: string;
    type: NotificationType;
    title: string;
    message: string;
    createdAt: Date;
  };

  smsJob: {
    agentId: string;
    telephone: string;
    message: string;
  } | null;
};

export async function processDeactivationWarning() {
  const expiredAgentsWithLatestExpiredCycle =
    await prisma.agent.findMany({
      where: {
        status: "EXPIRED",
      },
      select: {
        id: true,
        status: true,
        level: true,
        parentAgentId: true,
        fullName: true,
        email: true,
        telephone: true,

        downlines: {
          select: {
            id: true,
            fullName: true,
            email: true,
            telephone: true,
          },
        },

        maintenanceCycles: {
          where: {
            status: "EXPIRED",
            expiredAt: {
              not: null,
            },
          },
          orderBy: {
            expiredAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            expiredAt: true,
            status: true,
          },
        },
      },
    });

  for (
    const expiredAgent of
    expiredAgentsWithLatestExpiredCycle
  ) {
    const latestExpiredCycle =
      expiredAgent.maintenanceCycles[0];

    if (!latestExpiredCycle?.expiredAt) {
      continue;
    }

    const expiredDays =
      getDaysFromExpiredAt(
        latestExpiredCycle.expiredAt
      );

    try {
      const result =
        await prisma.$transaction(
          async (tx) => {
            const createdNotifications = [];

            const smsJobs: {
              agentId: string;
              telephone: string;
              message: string;
            }[] = [];

            if (
              expiredDays === 150 ||
              expiredDays === 166 ||
              expiredDays === 174
            ) {
              const agentTitle =
                `WARNING PERMANENT DEACTIVATION - Day ${expiredDays}`;

              const existingAgentNotification =
                await tx.agentNotification.findFirst({
                  where: {
                    agentId:
                      expiredAgent.id,

                    type:
                      NotificationType.MAINTENANCE_WARNING,

                    title:
                      agentTitle,
                  },
                });

              if (
                !existingAgentNotification
              ) {
                const agentNotification =
                  await tx.agentNotification.create({
                    data: {
                      agentId:
                        expiredAgent.id,

                      type:
                        NotificationType.MAINTENANCE_WARNING,

                      title:
                        agentTitle,

                      message:
                        `You are now at ${expiredDays} days since your account expired. ` +
                        `Please complete your sales requirements or request reactivation ` +
                        `to avoid permanent deactivation.`,
                    },
                  });

                createdNotifications.push(
                  agentNotification
                );

                if (
                  expiredAgent.telephone
                ) {
                  smsJobs.push({
                    agentId:
                      expiredAgent.id,

                    telephone:
                      expiredAgent.telephone,

                    message:
                      `Hi ${expiredAgent.fullName}, your account has been expired for ` +
                      `${expiredDays} days. Please complete your sales requirements or ` +
                      `request reactivation to avoid permanent deactivation.`,
                  });
                }
              }

              for (
                const downline of
                expiredAgent.downlines
              ) {
                const downlineTitle =
                  `UPLINE DEACTIVATION WARNING - Day ${expiredDays}`;

                const existingDownlineNotification =
                  await tx.agentNotification.findFirst({
                    where: {
                      agentId:
                        downline.id,

                      type:
                        NotificationType.MAINTENANCE_WARNING,

                      title:
                        downlineTitle,
                    },
                  });

                if (
                  existingDownlineNotification
                ) {
                  continue;
                }

                const downlineNotification =
                  await tx.agentNotification.create({
                    data: {
                      agentId:
                        downline.id,

                      type:
                        NotificationType.MAINTENANCE_WARNING,

                      title:
                        downlineTitle,

                      message:
                        `Your upline ${expiredAgent.fullName} is now at ` +
                        `${expiredDays} days since account expiration and may ` +
                        `be permanently deactivated soon.`,
                    },
                  });

                createdNotifications.push(
                  downlineNotification
                );

                if (downline.telephone) {
                  smsJobs.push({
                    agentId:
                      downline.id,

                    telephone:
                      downline.telephone,

                    message:
                      `Hi ${downline.fullName}, your upline ` +
                      `${expiredAgent.fullName} has been expired for ` +
                      `${expiredDays} days and may be permanently deactivated soon.`,
                  });
                }
              }
            }

            if (expiredDays >= 181) {
              await tx.agent.update({
                where: {
                  id:
                    expiredAgent.id,
                },
                data: {
                  status:
                    "DROPPED",
                },
              });

              const existingDroppedNotification =
                await tx.agentNotification.findFirst({
                  where: {
                    agentId:
                      expiredAgent.id,

                    type:
                      NotificationType.MAINTENANCE_DROPPED,

                    title:
                      "Account Permanently Deactivated",
                  },
                });

              if (
                !existingDroppedNotification
              ) {
                const droppedNotification =
                  await tx.agentNotification.create({
                    data: {
                      agentId:
                        expiredAgent.id,

                      type:
                        NotificationType.MAINTENANCE_DROPPED,

                      title:
                        "Account Permanently Deactivated",

                      message:
                        "Your account has been permanently deactivated because it remained expired for 181 days without successful reactivation.",
                    },
                  });

                createdNotifications.push(
                  droppedNotification
                );

                if (
                  expiredAgent.telephone
                ) {
                  smsJobs.push({
                    agentId:
                      expiredAgent.id,

                    telephone:
                      expiredAgent.telephone,

                    message:
                      `Hi ${expiredAgent.fullName}, your account has been permanently ` +
                      `deactivated because it remained expired for 181 days without ` +
                      `successful reactivation.`,
                  });
                }
              }

              for (
                const downline of
                expiredAgent.downlines
              ) {
                const downlineDroppedTitle =
                  "Upline Permanently Deactivated";

                const existingDownlineDroppedNotification =
                  await tx.agentNotification.findFirst({
                    where: {
                      agentId:
                        downline.id,

                      type:
                        NotificationType.MAINTENANCE_DROPPED,

                      title:
                        downlineDroppedTitle,
                    },
                  });

                if (
                  existingDownlineDroppedNotification
                ) {
                  continue;
                }

                const downlineDroppedNotification =
                  await tx.agentNotification.create({
                    data: {
                      agentId:
                        downline.id,

                      type:
                        NotificationType.MAINTENANCE_DROPPED,

                      title:
                        downlineDroppedTitle,

                      message:
                        `Your upline ${expiredAgent.fullName} has been permanently deactivated.`,
                    },
                  });

                createdNotifications.push(
                  downlineDroppedNotification
                );

                if (downline.telephone) {
                  smsJobs.push({
                    agentId:
                      downline.id,

                    telephone:
                      downline.telephone,

                    message:
                      `Hi ${downline.fullName}, your upline ` +
                      `${expiredAgent.fullName} has been permanently deactivated.`,
                  });
                }
              }
            }

            return {
              notifications:
                createdNotifications,

              smsJobs,
            };
          }
        );

      for (
        const notification of
        result.notifications
      ) {
        emitNotification(
          notification.agentId,
          notification
        );

        if (
          notification.agentId ===
            expiredAgent.id &&
          notification.type ===
            NotificationType.MAINTENANCE_WARNING &&
          expiredAgent.email
        ) {
          await sendExpiringAgentEmail(
            expiredAgent.email,
            expiredDays,
            expiredAgent.fullName
          );
        }

        const notifiedDownline =
          expiredAgent.downlines.find(
            (downline) =>
              downline.id ===
              notification.agentId
          );

        if (
          notifiedDownline &&
          notification.type ===
            NotificationType.MAINTENANCE_WARNING &&
          notifiedDownline.email
        ) {
          await sendDownlineEmail(
            notifiedDownline.email,
            expiredAgent.fullName,
            expiredDays,
            notifiedDownline.fullName
          );
        }
      }

      const smsResults =
        await Promise.allSettled(
          result.smsJobs.map(
            (smsJob) =>
              sendSmsToGateway(
                smsJob.telephone,
                smsJob.message
              )
          )
        );

      smsResults.forEach(
        (smsResult, index) => {
          if (
            smsResult.status ===
            "rejected"
          ) {
            const smsJob =
              result.smsJobs[index];

            console.error(
              "Failed to send deactivation SMS:",
              {
                agentId:
                  smsJob.agentId,

                telephone:
                  smsJob.telephone,

                error:
                  smsResult.reason,
              }
            );
          }
        }
      );
    } catch (error) {
      console.error(
        `Failed deactivation warning for agent ${expiredAgent.id}`,
        error
      );
    }
  }
}




export async function processMaintenanceWarnings() {
  const now = new Date();

  const currentMonth =
    now.getMonth() + 1;

  const currentYear =
    now.getFullYear();

  const lastDay =
    new Date(
      currentYear,
      currentMonth,
      0
    ).getDate();

  const today =
    now.getDate();

  const remainingDays =
    lastDay - today;

  let warningType:
    | "7"
    | "3"
    | "1"
    | null = null;

  let title = "";
  let message = "";

  if (remainingDays <= 7) {
    warningType = "7";

    title =
      "Maintenance Reminder";

    message =
      "You have 7 days remaining to complete your sales maintenance.";
  }

  if (remainingDays <= 3) {
    warningType = "3";

    title =
      "Maintenance Warning";

    message =
      "You only have 3 days remaining to complete your sales maintenance.";
  }

  if (remainingDays <= 1) {
    warningType = "1";

    title =
      "Final Maintenance Notice";

    message =
      "Today is the final day to complete your sales maintenance.";
  }

  if (!warningType) {
    return;
  }

  const cycles =
    await prisma.agentMaintenanceCycle.findMany({
      where: {
        status: "ACTIVE",

        cycleMonth:
          currentMonth,

        cycleYear:
          currentYear,
      },

      include: {
        agent: {
          select: {
            id: true,
            fullName: true,
            telephone: true,
          },
        },
      },
    });

  for (const cycle of cycles) {
    try {
      const shouldSend =
        (warningType === "7" &&
          !cycle.sevenDayWarningSent) ||

        (warningType === "3" &&
          !cycle.threeDayWarningSent) ||

        (warningType === "1" &&
          !cycle.oneDayWarningSent);

      if (!shouldSend) {
        continue;
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Recheck the cycle inside the transaction
             * to prevent duplicate scheduled runs.
             */
            const currentCycle =
              await tx.agentMaintenanceCycle.findUnique({
                where: {
                  id: cycle.id,
                },

                select: {
                  sevenDayWarningSent: true,
                  threeDayWarningSent: true,
                  oneDayWarningSent: true,
                },
              });

            if (!currentCycle) {
              throw new Error(
                "Maintenance cycle not found."
              );
            }

            const alreadySent =
              (warningType === "7" &&
                currentCycle.sevenDayWarningSent) ||

              (warningType === "3" &&
                currentCycle.threeDayWarningSent) ||

              (warningType === "1" &&
                currentCycle.oneDayWarningSent);

            if (alreadySent) {
              return null;
            }

            const notification =
              await tx.agentNotification.create({
                data: {
                  agentId:
                    cycle.agentId,

                  type:
                    NotificationType.MAINTENANCE_WARNING,

                  title,

                  message,
                },
              });

            const updateData: {
              sevenDayWarningSent?: boolean;
              threeDayWarningSent?: boolean;
              oneDayWarningSent?: boolean;
            } = {};

            if (warningType === "7") {
              updateData.sevenDayWarningSent =
                true;
            }

            if (warningType === "3") {
              updateData.threeDayWarningSent =
                true;
            }

            if (warningType === "1") {
              updateData.oneDayWarningSent =
                true;
            }

            await tx.agentMaintenanceCycle.update({
              where: {
                id: cycle.id,
              },

              data:
                updateData,
            });

            return {
              notification,

              smsJob:
                cycle.agent.telephone
                  ? {
                      agentId:
                        cycle.agentId,

                      telephone:
                        cycle.agent.telephone,

                      message:
                        `Hi ${cycle.agent.fullName}, ${message}`,
                    }
                  : null,
            };
          }
        );

      if (!result) {
        continue;
      }

      emitNotification(
        cycle.agentId,
        result.notification
      );

      /*
       * Send SMS only after the transaction commits.
       * SMS failure must not roll back the notification
       * or warning flag.
       */
      if (result.smsJob) {
        try {
          await sendSmsToGateway(
            result.smsJob.telephone,
            result.smsJob.message
          );
        } catch (smsError) {
          console.error(
            "Failed to send maintenance warning SMS:",
            {
              cycleId:
                cycle.id,

              agentId:
                result.smsJob.agentId,

              telephone:
                result.smsJob.telephone,

              error:
                smsError,
            }
          );
        }
      }
    } catch (error) {
      console.error(
        `Failed warning for cycle ${cycle.id}`,
        error
      );
    }
  }
}




async function completeProbation(
  tx: any,
  params: {
    request: any;
    now: Date;
    currentMonth: number;
    currentYear: number;
    cycleStartDate: Date;
    cycleEndDate: Date;
    isGracePeriod: boolean;
  }
): Promise<ProbationResult> {
  const {
    request,
    now,
    currentMonth,
    currentYear,
    cycleStartDate,
    cycleEndDate,
    isGracePeriod,
  } = params;

  await tx.agentReactivationRequest.update({
    where: {
      id: request.id,
    },

    data: {
      status:
        ReactivationRequestStatus.COMPLETED,

      completedAt:
        now,

      isCompleted:
        true,
    },
  });

  await tx.agent.update({
    where: {
      id:
        request.agentId,
    },

    data: {
      status:
        "ACTIVE",
    },
  });

  await tx.agentMaintenanceCycle.create({
    data: {
      agentId:
        request.agentId,

      cycleMonth:
        currentMonth,

      cycleYear:
        currentYear,

      cycleStartDate,
      cycleEndDate,

      requiredSales:
        isGracePeriod
          ? 0
          : 1,

      completedSales:
        0,

      remainingSales:
        isGracePeriod
          ? 0
          : 1,

      isCompleted:
        isGracePeriod,

      isFirstCycle:
        true,

      status:
        isGracePeriod
          ? "GRACE"
          : "ACTIVE",
    },
  });

  const notification =
    await tx.agentNotification.create({
      data: {
        agentId:
          request.agentId,

        type:
          NotificationType.MAINTENANCE_PROBATION,

        title:
          "PROBATION COMPLETED",

        message:
          "You have successfully completed your probation period and your account has been reactivated.",
      },
    });

  return {
    notification,

    smsJob:
      request.agent?.telephone
        ? {
            agentId:
              request.agentId,

            telephone:
              request.agent.telephone,

            message:
              `Hi ${request.agent.fullName}, you have successfully completed your probation period and your account has been reactivated.`,
          }
        : null,
  };
}

async function failProbation(
  tx: any,
  params: {
    request: any;
    now: Date;
    currentMonth: number;
    currentYear: number;
    cycleStartDate: Date;
    cycleEndDate: Date;
    isGracePeriod: boolean;
  }
): Promise<ProbationResult> {
  const {
    request,
    now,
    currentMonth,
    currentYear,
    cycleStartDate,
    cycleEndDate,
  } = params;

  const cooldownUntil =
    new Date(now);

  cooldownUntil.setDate(
    cooldownUntil.getDate() + 30
  );

  await tx.agentReactivationRequest.update({
    where: {
      id:
        request.id,
    },

    data: {
      status:
        ReactivationRequestStatus.FAILED,

      failedAt:
        now,

      cooldownUntil,

      isCompleted:
        false,
    },
  });

  await tx.agent.update({
    where: {
      id:
        request.agentId,
    },

    data: {
      status:
        "EXPIRED",
    },
  });

  await tx.agentMaintenanceCycle.create({
    data: {
      agentId:
        request.agentId,

      cycleMonth:
        currentMonth,

      cycleYear:
        currentYear,

      cycleStartDate,
      cycleEndDate,

      requiredSales:
        0,

      completedSales:
        0,

      remainingSales:
        0,

      isCompleted:
        false,

      status:
        "EXPIRED",

      expiredAt:
        now,
    },
  });

  const notification =
    await tx.agentNotification.create({
      data: {
        agentId:
          request.agentId,

        type:
          NotificationType.MAINTENANCE_PROBATION,

        title:
          "PROBATION FAILED",

        message:
          "Your probation period has ended and the required sales target was not completed. You may submit another reactivation request after 30 days.",
      },
    });

  return {
    notification,

    smsJob:
      request.agent?.telephone
        ? {
            agentId:
              request.agentId,

            telephone:
              request.agent.telephone,

            message:
              `Hi ${request.agent.fullName}, your probation period has ended and the required sales target was not completed. You may submit another reactivation request after 30 days.`,
          }
        : null,
  };
}

export async function processProbationRequests() {
  const now =
    new Date();

  const currentMonth =
    now.getMonth() + 1;

  const currentYear =
    now.getFullYear();

  const currentDay =
    now.getDate();

  const isGracePeriod =
    currentDay > 12;

  const cycleStartDate =
    new Date(
      currentYear,
      currentMonth - 1,
      1
    );

  const cycleEndDate =
    new Date(
      currentYear,
      currentMonth,
      0,
      23,
      59,
      59
    );

  const probationRequests =
    await prisma.agentReactivationRequest.findMany({
      where: {
        status:
          ReactivationRequestStatus.PROBATION,

        probationStartedAt: {
          not:
            null,
        },

        probationEndsAt: {
          not:
            null,
        },
      },

      include: {
        agent: {
          select: {
            id:
              true,

            fullName:
              true,

            telephone:
              true,
          },
        },
      },
    });

  for (
    const request of
    probationRequests
  ) {
    try {
      const result =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Re-read the request inside the transaction.
             * This avoids processing an outdated request
             * if another worker already changed its status.
             */
            const currentRequest =
              await tx.agentReactivationRequest.findUnique({
                where: {
                  id:
                    request.id,
                },

                include: {
                  agent: {
                    select: {
                      id:
                        true,

                      fullName:
                        true,

                      telephone:
                        true,
                    },
                  },
                },
              });

            if (!currentRequest) {
              return null;
            }

            if (
              currentRequest.status !==
              ReactivationRequestStatus.PROBATION
            ) {
              return null;
            }

            if (
              !currentRequest.probationEndsAt
            ) {
              return null;
            }

            const probationEnd =
              currentRequest.probationEndsAt;

            const isAdminApproval =
              currentRequest.requestType ===
              ReactivationType.ADMIN_APPROVAL;

            if (!isAdminApproval) {
              return null;
            }

            if (
              currentRequest.completedSales >=
              currentRequest.requiredSales
            ) {
              return completeProbation(
                tx,
                {
                  request:
                    currentRequest,

                  now,
                  currentMonth,
                  currentYear,
                  cycleStartDate,
                  cycleEndDate,
                  isGracePeriod,
                }
              );
            }

            const probationAlreadyEnded =
              now >= probationEnd;

            if (
              !probationAlreadyEnded
            ) {
              return null;
            }

            return failProbation(
              tx,
              {
                request:
                  currentRequest,

                now,
                currentMonth,
                currentYear,
                cycleStartDate,
                cycleEndDate,
                isGracePeriod,
              }
            );
          }
        );

      if (!result) {
        continue;
      }

      emitNotification(
        request.agentId,
        result.notification
      );

      /*
       * Send SMS only after the transaction commits.
       */
      if (result.smsJob) {
        try {
          await sendSmsToGateway(
            result.smsJob.telephone,
            result.smsJob.message
          );
        } catch (smsError) {
          console.error(
            "Failed to send probation SMS:",
            {
              requestId:
                request.id,

              agentId:
                result.smsJob.agentId,

              telephone:
                result.smsJob.telephone,

              error:
                smsError,
            }
          );
        }
      }
    } catch (error) {
      console.error(
        `Failed probation processing for request ${request.id}`,
        error
      );
    }
  }
}



export async function processNewClientsToPending() {
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  try {
    const result =
      await prisma.dailyClientDetails.updateMany({
        where: {
          clientStatus:
            ClientStatus.NEW,

          createdAt: {
            lt: startOfToday,
          },
        },

        data: {
          clientStatus:
            ClientStatus.PENDING,
        },
      });

    console.log(
      `Updated ${result.count} NEW client(s) to PENDING.`
    );

    return result;
  } catch (error) {
    console.error(
      "Failed to update NEW clients to PENDING:",
      error
    );

    throw error;
  }
}