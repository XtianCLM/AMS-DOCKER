import { CreateCommissionPayload, ProcessDirectCommissionPayoutPayload, UpdateCommissionRules, UpdateOverrideRules } from "@repo/shared";
import prisma from "../../lib/prisma";
import { calculateDirectCommission } from "./utils/commission.direct";
import { getAgentUplines } from "./utils/commission.fetchUpline";
import generateSaleReference from "./utils/commission.saleRef";
import { CreditLedgerType, CreditSource, PayoutChannel, PayoutPurpose, WithdrawalStatus } from "../../../generated/prisma";
import { syncAgentCreditScore } from "../../services/creditLedger/creditLedger.service";

import { sendSmsToGateway } from "../../services/sms/sms.services";

export const scannedAgent = async (
  agentCode: string,
  clientId: string
) => {



  const agent = await prisma.agent.findFirst({
    where: {
      agentCode,
    },

    include: {
  
      parentAgent: {
        include: {
          parentAgent: true,
        },
      },
    },
  });

  if (!agent) {
    throw new Error(
      "Agent not found"
    );
  }


  const client =
    await prisma.dailyClientDetails.findUnique({
      where: {
        id: clientId,
      },
    });

  if (!client) {
    throw new Error(
      "Client not found"
    );
  }

  const commissionRule =
    await prisma.commissionRule.findFirst({
      where: {
        agentStatus:
          agent.status,
        isActive: true,
      },
    });

  if (!commissionRule) {
    throw new Error(
      "Commission rule not found"
    );
  }

  const commissionAmount =
    calculateDirectCommission({
      treshold: Number(
        commissionRule.sspAmount
      ),

      formulaType:
        commissionRule.formulaType,

      installmentAmount:
        Number(
          client.loanAmount
        ),

      term:
        client.term,

      piraRate:
        commissionRule.piraRate,
    });



  const uplines = getAgentUplines(agent);




  const overrideRules =
    await prisma.overrideCommissionRule.findMany({
      where: {
        sourceLevel:
          agent.level,

        isActive: true,
      },
    });



  const blockedStatuses = ["EXPIRED", "PROBATION"];

  const isBlockedStatus = (status: string) =>
    blockedStatuses.includes(status);

  const l2Upline = uplines.find(
    (u) => u.level === "L2"
  );

  const overrideCommissions = uplines.map((upline) => {
    const rule = overrideRules.find(
      (r) => r.receiverLevel === upline.level
    );

    let blocked = false;
    let reason: string | null = null;

    // L3 EXPIRED / PROBATION -> block L2 and L1
    if (
      agent.level === "L3" &&
      isBlockedStatus(agent.status)
    ) {
      blocked = true;
      reason = "Blocked because source L3 is expired or probation";
    }

    // L3 ACTIVE, but L2 EXPIRED / PROBATION -> block L2 and L1
    else if (
      agent.level === "L3" &&
      l2Upline &&
      isBlockedStatus(l2Upline.status) &&
      ["L2", "L1"].includes(upline.level)
    ) {
      blocked = true;
      reason = "Blocked because L2 is expired or probation";
    }

    // L2 makes sale and L2 is EXPIRED / PROBATION -> block L1
    else if (
      agent.level === "L2" &&
      isBlockedStatus(agent.status) &&
      upline.level === "L1"
    ) {
      blocked = true;
      reason = "Blocked because source L2 is expired or probation";
    }

    // L1 itself is EXPIRED / PROBATION -> L1 earns nothing
    else if (
      upline.level === "L1" &&
      isBlockedStatus(upline.status)
    ) {
      blocked = true;
      reason = "L1 is expired or probation";
    }

    return {
      agent: {
        id: upline.id,
        agentCode: upline.agentCode,
        fullName: upline.fullName,
        level: upline.level,
        status: upline.status,
        telephone: upline.telephone
      },

      amount: blocked
        ? 0
        : Number(rule?.amount ?? 0),

      blocked,

      reason,

      ruleId: rule?.id ?? null,
    };
  });

  return {
    agent,

    client,

    directCommission: {
      amount:
        commissionAmount,

      rule: commissionRule,
    },

    uplines,

    overrideCommissions,
  };
};




export const createCommissionScan =
  async ({
    clientId,
    agentId,
    branchId,
    scannedBy,
    payoutChannel,
    gcashNumber,
    checkNumber,
  }: CreateCommissionPayload) => {
    /*
     * Validate payout channel.
     */
    if (
      payoutChannel !== "GCASH" &&
      payoutChannel !== "CHECK"
    ) {
      throw new Error(
        "Invalid payout channel"
      );
    }

    const normalizedCheckNumber =
      checkNumber?.trim() || null;

    if (
      payoutChannel === "CHECK" &&
      !normalizedCheckNumber
    ) {
      throw new Error(
        "Check number is required for CHECK payouts"
      );
    }

    const agent =
      await prisma.agent.findUnique({
        where: {
          id: agentId,
        },

        select: {
          id: true,
          agentCode: true,
          telephone: true,
          fullName: true
        },
      });

    if (!agent) {
      throw new Error(
        "Agent not found"
      );
    }

    if (
      payoutChannel === "GCASH" &&
      !agent.fullName 
    ){
      throw new Error(
        "GCash account name is required."
      );
    }
    if (
      payoutChannel === "GCASH" &&
      !gcashNumber
    ){
      throw new Error(
         "GCash account number is required."
      );
    }

    const scanData =
      await scannedAgent(
        agent.agentCode,
        clientId
      );

    const saleReference =
      generateSaleReference("SCAN");
    
   
    const result =  await prisma.$transaction(
      async (tx) => {
        /*
         * Prevent the same client from being
         * commissioned more than once.
         */
        const existingCommissionScan =
          await tx.commissionScan.findFirst({
            where: {
              clientId,
            },

            select: {
              id: true,
            },
          });

        if (existingCommissionScan) {
          throw new Error(
            "Commission has already been processed for this client"
          );
        }

        /*
         * Create the main commission scan record.
         *
         * The direct commission is paid immediately
         * through GCASH or CHECK.
         */
        const commissionScan =
          await tx.commissionScan.create({
            data: {
              clientId,

              claimedByAgentId:
                agentId,

              branchId,

              scannedBy,

              saleReference,

              AgentScannedStatus:
                scanData.agent.status,

              payoutChannel,

              checkNumber:
                payoutChannel === "CHECK"
                  ? normalizedCheckNumber
                  : null,
            },
          });

        /*
         * Record the direct commission transaction.
         *
         * Important:
         * The direct commission is not added to the
         * withdrawal ledger because it is paid
         * immediately through GCASH or CHECK.
         */
        const directTransaction =
        await tx.commissionTransaction.create({
          data: {
            sourceAgentId:
              scanData.agent.id,

            receiverAgentId:
              scanData.agent.id,

            commissionRuleId:
              scanData.directCommission.rule.id,

            overrideCommissionRuleId:
              null,

            commissionScanId:
              commissionScan.id,

            commissionType:
              "DIRECT",

            saleAmount:
              Number(
                scanData.client.loanAmount ?? 0
              ),

            commissionAmount:
              scanData.directCommission.amount,

            percentage:
              scanData.directCommission.rule
                .piraRate,

            sourceLevel:
              scanData.agent.level,

            receiverLevel:
              scanData.agent.level,

            remarks:
              payoutChannel === "GCASH"
                    ? "Direct commission payout pending"
                    : `Direct commission prepared for CHECK ${normalizedCheckNumber}`,
          },
        });

        let directPayoutRequest = null;

        directPayoutRequest =
          await tx.creditWithdrawalRequest.create({
            data: {
              agentId:
                scanData.agent.id,
              purpose:
                PayoutPurpose.DIRECT_COMMISSION,
              commissionScanId:
                commissionScan.id,
              commissionTransactionId:
                directTransaction.id,
              amount:
                scanData.directCommission.amount,
              payoutChannel:
                payoutChannel,
              accountName:
                agent.fullName!,
              accountNumber: gcashNumber ?? null,
              status:
                WithdrawalStatus.PENDING,
              remarks:
                "Automatic direct commission payout",
            },
          });

        /*
         * Track only upline agents whose withdrawal
         * balances need to be synchronized.
         */
        const affectedUplines =
          new Map<
            string,
            {
              amount: number;
              fullName: string;
              telephone: string | null;
            }
          >();

        /*
         * Create override commission transactions.
         */
        for (
          const override of
          scanData.overrideCommissions
        ) {
          await tx.commissionTransaction.create({
            data: {
              sourceAgentId:
                scanData.agent.id,

              receiverAgentId:
                override.agent.id,

              commissionRuleId:
                null,

              overrideCommissionRuleId:
                override.ruleId,

              commissionScanId:
                commissionScan.id,
                

              commissionType:
                "DOWNLINE",

              saleAmount:
                Number(
                  scanData.client.loanAmount ?? 0
                ),

              commissionAmount:
                override.amount,

              sourceLevel:
                scanData.agent.level,

              receiverLevel:
                override.agent.level,

              remarks:
                override.blocked
                  ? `BLOCKED: ${override.reason}`
                  : "Override Commission",
            },
          });

          /*
           * Blocked override commissions are recorded
           * but are not added to the withdrawal ledger.
           */
          if (override.blocked) {
            continue;
          }

          await tx.agentWithdrawalLedger.create({
            data: {
              agentId:
                override.agent.id,

              type:
                CreditLedgerType.CREDIT,

              amount:
                override.amount,

              sourceType:
                CreditSource.COMMISSION,

              sourceId:
                commissionScan.id,

              
              description:
                `Override commission earned from ${scanData.agent.fullName}`,
            },
          });

          const existingUpline =
            affectedUplines.get(
              override.agent.id
            );

          affectedUplines.set(
            override.agent.id,
            {
              amount:
                (existingUpline?.amount ?? 0) +
                Number(override.amount),

              fullName:
                override.agent.fullName,

              telephone:
                override.agent.telephone ?? null,
            }
          );
        }

        /*
         * Synchronize only the uplines that received
         * withdrawable override commissions.
         */
        const uplineSmsNotifications: {
          agentId: string;
          fullName: string;
          telephone: string;
          creditedAmount: number;
          currentBalance: number | null;
        }[] = [];

        for (
          const [
            receiverAgentId,
            upline,
          ] of affectedUplines
        ) {
          await syncAgentCreditScore(
            tx,
            receiverAgentId
          );

          /*
          * Read the updated credit score after synchronization.
          * Change creditScore to the actual field name in
          * your Agent model.
          */
          const updatedAgent =
            await tx.agent.findUnique({
              where: {
                id: receiverAgentId,
              },

              select: {
                creditScore: true,
              },
            });

          if (upline.telephone) {
            uplineSmsNotifications.push({
              agentId:
                receiverAgentId,

              fullName:
                upline.fullName,

              telephone:
                upline.telephone,

              creditedAmount:
                upline.amount,

              currentBalance:
                updatedAgent
                  ? Number(
                      updatedAgent.creditScore
                    )
                  : null,
            });
          }
        }

        /*
         * Maintenance cycle handling.
         */
        if (
          scanData.agent.status ===
          "ACTIVE"
        ) {
          const activeCycle =
            await tx.agentMaintenanceCycle.findFirst({
              where: {
                agentId:
                  scanData.agent.id,

                status: {
                  in: [
                    "ACTIVE",
                    "GRACE",
                  ],
                },
              },

              orderBy: {
                createdAt: "desc",
              },
            });

          if (!activeCycle) {
            throw new Error(
              "No active maintenance cycle found"
            );
          }

          if (
            activeCycle.status ===
            "ACTIVE"
          ) {
            const remainingSales =
              Math.max(
                activeCycle.requiredSales -
                  1,
                0
              );

            await tx.agentMaintenanceCycle.update({
              where: {
                id:
                  activeCycle.id,
              },

              data: {
                requiredSales:
                  remainingSales,

                completedSales:
                  activeCycle.completedSales +
                  1,

                remainingSales,

                isCompleted:
                  remainingSales === 0,
              },
            });
          } else {
            /*
             * GRACE cycle:
             * only increase completed sales.
             */
            await tx.agentMaintenanceCycle.update({
              where: {
                id:
                  activeCycle.id,
              },

              data: {
                completedSales:
                  activeCycle.completedSales +
                  1,
              },
            });
          }
        }

        /*
         * Probation handling.
         */
        if (
          scanData.agent.status ===
          "PROBATION"
        ) {
          const now = new Date();

          const probationRequest =
            await tx.agentReactivationRequest.findFirst({
              where: {
                agentId:
                  scanData.agent.id,

                status:
                  "PROBATION",

                probationEndsAt: {
                  gte: now,
                },
              },

              orderBy: {
                createdAt: "desc",
              },
            });

          if (!probationRequest) {
            throw new Error(
              "No active probation request found"
            );
          }

          const completedSales =
            probationRequest.completedSales +
            1;

          const isCompleted =
            completedSales >=
            probationRequest.requiredSales;

          await tx.agentReactivationRequest.update({
            where: {
              id:
                probationRequest.id,
            },

            data: {
              completedSales,
              isCompleted,
            },
          });
        }

        /*
         * Mark the client as already commissioned.
         */
        await tx.dailyClientDetails.update({
          where: {
            id:
              clientId,
          },

          data: {
            clientStatus:
              "SCANNED",
          },
        });

        return {
            commissionScan,
            directTransaction,
            directPayoutRequest,
            agentFullName:
              agent.fullName,
            uplineSmsNotifications,
        };
      }
    );


    const smsResults =
      await Promise.allSettled(
        result.uplineSmsNotifications.map(
          async (notification) => {
            const formattedAmount =
              notification.creditedAmount
                .toLocaleString(
                  "en-PH",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                );

            const formattedBalance =
              notification.currentBalance !== null
                ? notification.currentBalance
                    .toLocaleString(
                      "en-PH",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )
                : null;

            const message =
              formattedBalance !== null
                ? `Hi ${notification.fullName}, you received an override commission of PHP ${formattedAmount} from your downline ${result.agentFullName}. Your updated credit balance is PHP ${formattedBalance}.`
                : `Hi ${notification.fullName}, you received an override commission of PHP ${formattedAmount} from your downline ${result.agentFullName}.`;

            return sendSmsToGateway(
              notification.telephone,
              message
            );
          }
        )
      );

    smsResults.forEach(
      (smsResult, index) => {
        if (
          smsResult.status ===
          "rejected"
        ) {
          const notification =
            result.uplineSmsNotifications[
              index
            ];

          console.error(
            "Failed to send upline commission SMS:",
            {
              agentId:
                notification.agentId,

              telephone:
                notification.telephone,

              error:
                smsResult.reason,
            }
          );
        }
      }
    );

        /*
     * CHECK does not use Xendit.
     *
     * The commission record has already been saved,
     * so it can be returned immediately.
     */
    if (
      payoutChannel === "CHECK"
    ) {
      return {
        commissionScan:
          result.commissionScan,

        directTransaction:
          result.directTransaction,

        payoutRequest:
          null,

        payoutStatus:
          "CHECK",
      };
    }

    if (!result.directPayoutRequest) {
      throw new Error(
        "Direct commission payout request was not created."
      );
    }

    /*
     * Automatically submit the payout to Xendit.
     *
     * No admin approval is required.
     */




    
    // try {
    //   const processedPayout =
    //     await processAutomaticDirectCommissionPayout({
    //       payoutRequestId:
    //         result.directPayoutRequest.id,

    //       agentFullName:
    //         result.agentFullName,
    //     });

    //   return {
    //     commissionScan:
    //       result.commissionScan,

    //     directTransaction:
    //       result.directTransaction,

    //     payoutRequest:
    //       processedPayout,

    //     payoutStatus:
    //       processedPayout.status,

    //     payoutMessage:
    //       "Direct commission payout submitted successfully.",
    //   };
    // } catch (error) {
    //   const failedPayout =
    //     await prisma.creditWithdrawalRequest.findUnique({
    //       where: {
    //         id:
    //           result.directPayoutRequest.id,
    //       },
    //     });

    //   return {
    //     commissionScan:
    //       result.commissionScan,

    //     directTransaction:
    //       result.directTransaction,

    //     payoutRequest:
    //       failedPayout,

    //     payoutStatus:
    //       WithdrawalStatus.FAILED,

    //     payoutMessage:
    //       error instanceof Error
    //         ? error.message
    //         : "The commission was created, but the GCash payout failed.",
    //   };
    // }


    try {

      return {
        commissionScan:
          result.commissionScan,

        directTransaction:
          result.directTransaction,

        payoutMessage:
          "Direct commission payout submitted successfully.",
      };
    } catch (error) {
      const failedPayout =
        await prisma.creditWithdrawalRequest.findUnique({
          where: {
            id:
              result.directPayoutRequest.id,
          },
        });

      return {
        commissionScan:
          result.commissionScan,

        directTransaction:
          result.directTransaction,

        payoutRequest:
          failedPayout,

        payoutStatus:
          WithdrawalStatus.FAILED,

        payoutMessage:
          error instanceof Error
            ? error.message
            : "The commission was created, but the GCash payout failed.",
      };
    }












  };




export const updateCommissionRuleService = async (
  data: UpdateCommissionRules
) => {
  const rule =
    await prisma.commissionRule.update({
      where: {
        id: data.id,
      },

      data: {
        ...(data.sspAmount !== undefined && {
          sspAmount: data.sspAmount,
        }),

        ...(data.piraRate !== undefined && {
          piraRate: data.piraRate,
        }),
      },
    });

  return rule;
};