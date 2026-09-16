import prisma from "../../lib/prisma";
import { GetClientsParams } from "@repo/shared";

import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";


import { ClientStatus } from "../../../generated/prisma";
import { parseDbfFile } from "../../dffile/dfReader";


// -----------------------------------------------------
// GET CLIENTS
// -----------------------------------------------------

export const getAllClients = async ({
  page = 1,
  limit = 10,
  search,
  status,
}: GetClientsParams) => {
  const skip =
    (page - 1) * limit;

  const whereCondition = {
    ...(search && {
      clientName: {
        contains: search,
        mode:
          "insensitive" as const,
      },
    }),

    ...(status && {
      clientStatus:
        status as ClientStatus,
    }),
  };

  const [data, total] =
    await Promise.all([
      prisma.dailyClientDetails.findMany({
        where:
          whereCondition,

        skip,

        take:
          limit,

        orderBy: {
          createdAt:
            "desc",
        },
      }),

      prisma.dailyClientDetails.count({
        where:
          whereCondition,
      }),
    ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages:
      Math.ceil(
        total / limit
      ),
  };
};

// -----------------------------------------------------
// COMMISSION DETAILS
// -----------------------------------------------------

export const getCommissionDetails = async (
  clientId: string
) => {
  const scan =
    await prisma.commissionScan.findUnique({
      where: {
        clientId,
      },

      include: {
        client: true,
        branch: true,
        scanner: true,

        commissionTransactions: {
          include: {
            sourceAgent: true,
            receiverAgent: true,
            commissionRule: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

  if (!scan) {
    throw new Error(
      "Commission details not found"
    );
  }

  return scan;
};


// -----------------------------------------------------
// IMPORT CLIENTS FROM DBF
// -----------------------------------------------------

interface ImportDbfParams {
  buffer: Buffer;
}

export const importClientsFromDbf = async ({
  buffer,
}: ImportDbfParams) => {
  const tempFilePath = path.join(
    os.tmpdir(),
    `${crypto.randomUUID()}.dbf`
  );

  try {
    await fs.writeFile(
      tempFilePath,
      buffer
    );

    const clients =
      await parseDbfFile(
        tempFilePath
      );

    if (clients.length === 0) {
      throw new Error(
        "The DBF file contains no records."
      );
    }

    const validClients =
      clients.filter(
        (client) =>
          client.NAME &&
          client.NAME.trim() !== "" &&
          Number.isFinite(client.ID) &&
          client.IN_DATE
      );

    if (validClients.length === 0) {
      throw new Error(
        "No valid client records found."
      );
    }

    const data =
      validClients.map(
        (client) => ({
          sourceClientId:
            client.ID,

          clientName:
            client.NAME.trim(),

          in_date:
            client.IN_DATE
              ? new Date(client.IN_DATE)
              : null,

          loanAmount:
            client.LOANAMT ?? 0,

          term:
            client.TERMS ?? 0,

          clientStatus:
            ClientStatus.NEW,
        })
      );

    const result =
      await prisma.dailyClientDetails.createMany({
        data,

        skipDuplicates: true,
      });

    const duplicateRecords =
      validClients.length -
      result.count;

    return {
      totalDbfRecords:
        clients.length,

      validRecords:
        validClients.length,

      insertedRecords:
        result.count,

      duplicateRecords,
    };
  } finally {
    await fs
      .unlink(tempFilePath)
      .catch(() => {});
  }
};