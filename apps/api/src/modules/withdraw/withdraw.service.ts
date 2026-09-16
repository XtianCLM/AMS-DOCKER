import { CreditLedgerType, CreditSource, WithdrawalStatus, CompanyExpenseType, CompanyExpenseSource, PayoutChannel, } from "../../../generated/prisma";
import prisma from "../../lib/prisma";
import { getAgentAvailableCredit, syncAgentCreditScore } from "../../services/creditLedger/creditLedger.service";
import { emitAdminWithdrawUpdated } from "../../socket/socketEmitter";





const ensureAdmin = async (adminId: number) => {
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!admin) {
    throw new Error("User not found.");
  }

  const isAdmin = admin.roles.some(({ role }) =>
    ["ADMIN", "OPERATIONS"].includes(role.name)
  );

  if (!isAdmin) {
    throw new Error("Only ADMIN or OPERATIONS can perform this action.");
  }

  return admin;
};

// export const createMyWithdrawalRequestService = async (
//   userId: number,
//   payload: {
//     amount: number;
//     payoutChannel: "GCASH";
//     accountName: string;
//     accountNumber: string;
//   }
// ) => {
//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     include: { agent: true },
//   });

//   if (!user?.agent) {
//     throw new Error("Agent account not found.");
//   }

//   const agentId = user.agent.id;

//   if (payload.payoutChannel !== "GCASH") {
//     throw new Error("Only GCash withdrawals are currently supported.");
//   }

//   if (!payload.amount || payload.amount <= 0) {
//     throw new Error("Invalid withdrawal amount.");
//   }

//   if (!payload.accountName?.trim()) {
//     throw new Error("Account name is required.");
//   }

//   if (!payload.accountNumber?.trim()) {
//     throw new Error("Account number is required.");
//   }

//   const existingActiveWithdrawal =
//     await prisma.creditWithdrawalRequest.findFirst({
//       where: {
//         agentId: agentId,
//         status: {
//           in: ["PENDING", "PROCESSING"],
//         },
//       },
//     });

//   if (existingActiveWithdrawal) {
//     throw new Error(
//       "You already have a pending or processing withdrawal request."
//     );
//   }

//   const availableBalance =
//     await getAgentAvailableCredit(agentId);

//   if (payload.amount > availableBalance.available) {
//     throw new Error(
//       `Insufficient withdrawable balance. Available balance is ₱${availableBalance.available.toLocaleString()}.`
//     );
//   }

//   return prisma.$transaction(async (tx) => {
//     const withdrawal =
//       await tx.creditWithdrawalRequest.create({
//         data: {
//           agentId: agentId,
//           amount: payload.amount,
//           payoutChannel: "GCASH",
//           accountName: payload.accountName.trim(),
//           accountNumber: payload.accountNumber.trim(),
//           status: WithdrawalStatus.PENDING,
//         },
//       });

//     await tx.agentWithdrawalLedger.create({
//       data: {
//         agentId: agentId,
//         type: CreditLedgerType.RESERVE,
//         amount: payload.amount,
//         sourceType: CreditSource.WITHDRAWAL,
//         sourceId: withdrawal.id,
//         description: "Withdrawal amount reserved",
//       },
//     });

//     await syncAgentCreditScore(tx,agentId);

//     return withdrawal;
//   });

  
// };

export const createMyWithdrawalRequestService = async (
  userId: number,
  payload: {
    amount: number;
    payoutChannel: "GCASH";
    accountName: string;
    accountNumber: string;
  }
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

  const agentId = user.agent.id;

  if (payload.payoutChannel !== "GCASH") {
    throw new Error("Only GCash withdrawals are currently supported.");
  }

  if (!payload.amount || payload.amount <= 0) {
    throw new Error("Invalid withdrawal amount.");
  }

  if(payload.amount < 300){
    throw new Error ("Withdrawal amount should be 300 or higher.")
  }

  if (!payload.accountName?.trim()) {
    throw new Error("Account name is required.");
  }

  if (!payload.accountNumber?.trim()) {
    throw new Error("Account number is required.");
  }

  const existingActiveWithdrawal =
    await prisma.creditWithdrawalRequest.findFirst({
      where: {
        agentId,
        status: {
          in: [
            WithdrawalStatus.PENDING,
            WithdrawalStatus.PROCESSING,
          ],
        },
      },
    });

  if (existingActiveWithdrawal) {
    throw new Error(
      "You already have a pending or processing withdrawal request."
    );
  }

  const availableBalance =
    await getAgentAvailableCredit(agentId);

  if (payload.amount > availableBalance.available) {
    throw new Error(
      `Insufficient withdrawable balance. Available balance is ₱${availableBalance.available.toLocaleString()}.`
    );
  }

  const withdrawal =
    await prisma.$transaction(async (tx) => {
      const createdWithdrawal =
        await tx.creditWithdrawalRequest.create({
          data: {
            agentId,
            amount: payload.amount,
            payoutChannel: PayoutChannel.GCASH,
            accountName: payload.accountName.trim(),
            accountNumber: payload.accountNumber.trim(),
            status: WithdrawalStatus.PENDING,
          },
        });

      await tx.agentWithdrawalLedger.create({
        data: {
          agentId,
          type: CreditLedgerType.RESERVE,
          amount: payload.amount,
          sourceType: CreditSource.WITHDRAWAL,
          sourceId: createdWithdrawal.id,
          description: "Withdrawal amount reserved",
        },
      });

      await syncAgentCreditScore(
        tx,
        agentId
      );

      return createdWithdrawal;
    });

    emitAdminWithdrawUpdated({
      withdrawId: withdrawal.id,
      agentId: withdrawal.agentId,
      status: withdrawal.status,
      amount: Number(withdrawal.amount),
      payoutChannel: withdrawal.payoutChannel,
      createdAt: withdrawal.createdAt,
    });

  return withdrawal;
};




export const uploadWithdrawalReceiptService = async (
  withdrawalId: string,
  filename: string
) => {
  const withdrawal =
    await prisma.creditWithdrawalRequest.findUnique({
      where: {
        id: withdrawalId,
      },
    });

  if (!withdrawal) {
    throw new Error(
      "Withdrawal request not found."
    );
  }

  const receiptImg =
    `/uploads/withdrawal-receipts/${filename}`;

  const updatedWithdrawal =
    await prisma.creditWithdrawalRequest.update({
      where: {
        id: withdrawalId,
      },

      data: {
        receiptImg,
        status: WithdrawalStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

  emitAdminWithdrawUpdated({
    withdrawId: updatedWithdrawal.id,
    agentId: updatedWithdrawal.agentId,
    status: updatedWithdrawal.status,
    amount: Number(
      updatedWithdrawal.amount
    ),
    payoutChannel:
      updatedWithdrawal.payoutChannel,
    createdAt:
      updatedWithdrawal.updatedAt,
  });

  return updatedWithdrawal;
};