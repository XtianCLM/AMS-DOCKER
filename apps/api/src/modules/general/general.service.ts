import { GetUsersParams, GetBranchParams, CreateBranchPayload, GetCompanyParams, CreateCompanyPayload, CompanyActionPayload } from "@repo/shared"
import prisma from "../../lib/prisma";
import { Agent } from "http";
import { AgentLevel, AgentStatus } from "../../../generated/prisma";
import { Prisma } from "@prisma/client";
import { OverrideCommissionRulePayload, validateOverrideRulePayload } from "./validation/overrideCommissionRule.validation";
import { AppError } from "../../middleware/appError.middleware";


export const getCommissionSettingsService =
  async () => {

    const [
      commissionRules,
      overrideRules,
      // users
    ] = await prisma.$transaction([

      prisma.commissionRule.findMany({
        where: {
          isActive: true,
        },
      }),

      prisma.overrideCommissionRule.findMany({
        where: {
          isActive: true,
        },
      }),

      // prisma.user.findMany({
      //   where: {
      //     isActive: true,
      //   },

      //   select: {
      //     id: true,
      //     username: true,
      //     name: true,
      //     isActive:true,
      //     email: true,
      //   },

      //   orderBy: {
      //     username: "asc",
      //   },
      // }),
    ]);

    return {
      // users,
      commissionRules,
      overrideRules,
    };
};


export const getAllBranches = async ({
  page = 1,
  limit = 5,
  search,  
}: GetBranchParams) =>{
  const skip = (page - 1 ) * limit;

  const whereCondition = {
    deletedAt: null,
    ...(search && {
      OR:[
        {
          companyName: {
            contains: search,
            mode: "insensitive" as const
          }
        },
        {
          location: {
            contains: search,
            mode: "insensitive" as const
          }
        },
        {
          branchCode: {
            contains: search,
            mode: "insensitive" as const
          }
        },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.branch.findMany({
      where: whereCondition,
      skip,

      take: limit,

      orderBy: {
        companyName: "asc",
      },

    }),
    prisma.branch.count({
      where: whereCondition,
    }),
  ])
   return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export const getAllCompanies = async ({
  page = 1,
  limit = 5,
  search,  
}: GetCompanyParams) =>{
  const skip = (page - 1 ) * limit;

  const whereCondition = {
    deletedAt: null,
    ...(search && {
      OR:[
        {
          companyName: {
            contains: search,
            mode: "insensitive" as const
          }
        },
        {
          companyCode: {
            contains: search,
            mode: "insensitive" as const
          }
        },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.company.findMany({
      where: whereCondition,
      skip,

      take: limit,

      orderBy: {
        companyName: "asc",
      },

    }),
    prisma.company.count({
      where: whereCondition,
    }),
  ])
   return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}


export const getCompanyOptionsService =
  async () => {
    return prisma.company.findMany({
      where: {
        deletedAt:
          null,
      },
      orderBy: {
        companyName: "asc",
      },

      select: {
        companyCode: true,
        companyName: true,
      },
    });
  };

export const createCompanyService = 
  async ( 
    payload: 
     CreateCompanyPayload
  ) => {
    const companyCode = 
      payload.companyCode.trim()
      .toUpperCase();
    const companyName = 
      payload.companyName.trim();

    if (!companyCode){
        throw new AppError(
        "Company code is required.",
        400
      );
    }

    const existingCompany =
      await prisma.company.findUnique({
        where: {
          companyCode,
        },

        select: {
          companyCode: true,
        },
      });

    if (existingCompany) {
      throw new AppError(
        "Company code already exists.",
        409
      );
    }

    return prisma.company.create({
      data: {
        companyCode,
        companyName,
        
      },
    });

  }


export const createBranchService =
  async (
    payload:
      CreateBranchPayload
  ) => {
    const branchCode =
      payload.branchCode
        .trim()
        .toUpperCase();

    const companyId =
      payload.companyId.trim();

    const location =
      payload.location.trim();

    if (!branchCode) {
      throw new AppError(
        "Branch code is required.",
        400
      );
    }

    if (!companyId) {
      throw new AppError(
        "Company is required.",
        400
      );
    }

    const company =
      await prisma.company.findUnique({
        where: {
          companyCode: companyId,
        },

        select: {
          companyCode: true,
        },
      });

    if (!company) {
      throw new AppError(
        "Selected company does not exist.",
        404
      );
    }

    const existingBranch =
      await prisma.branch.findUnique({
        where: {
          branchCode,
        },

        select: {
          branchCode: true,
        },
      });

    if (existingBranch) {
      throw new AppError(
        "Branch code already exists.",
        409
      );
    }

    return prisma.branch.create({
      data: {
        branchCode,
        companyId,
        location,
      },

      include: {
        company: {
          select: {
            companyCode: true,
            companyName: true,
          },
        },
      },
    });
  };

export const updateCompanyService =
  async (
    companyCode:string,
    payload: CompanyActionPayload
  ) => {
    const company = 
      await prisma.company.findUnique({
        where:{
          companyCode
        },
      });

    if (!company){
      throw new Error(
        "Company not Found"
      );
    };

    if (
      payload.actionType === "EDIT"
    ) {
      const companyName =
      payload.companyName?.trim();

      if (!companyName) {
        throw new Error(
          "Company name is required."
        );
      }


      return prisma.company.update({
        where:{
          companyCode
        },
        data:{
          companyName
        }
      })
    }
   
    if (
      payload.actionType === "DELETE"
    ) {
      if (company.deletedAt){
        throw new Error(
          "Company is already deleted."
        )
      }

      return prisma.company.update({
        where:{
          companyCode,
        },
        data:{
          deletedAt:
            new Date(),
        },
      });
    }

    throw new Error(
      "Invalid company action."
    );

  }

export const updateBranchService =
  async (
    branchCode: string,
    payload: {
      companyName?: string;
      location?: string | null;
    }
  ) => {

    const branch =
      await prisma.branch.findUnique({
        where: {
          branchCode,
        },
      });

    if (!branch) {
      throw new Error(
        "Branch not found."
      );
    }

    const companyName =
      payload.companyName?.trim();

    if (!companyName) {
      throw new Error(
        "Company name is required."
      );
    }

    return prisma.branch.update({
      where: {
        branchCode,
      },

      data: {
        companyName,

        location:
          payload.location?.trim() ||
          null,
      },
    });
  };


export const DeleteUserService = 
  async (
    userId: number
  )=> {
     return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    // Disable login instead of deleting historical identity
    await tx.user.update({
      where: {
        id: userId,
      },
      data: {
        isActive: false,
        updateAt: new Date(),
      },
    });

    return {
      message: "User deactivated successfully.",
    };
  });
  }


export const deleteBranchService =
  async (
    branchCode: string
  ) => {
    const normalizedBranchCode =
      branchCode
        .trim()
        .toUpperCase();

    const branch =
      await prisma.branch.findUnique({
        where: {
          branchCode:
            normalizedBranchCode,
        },

        select: {
          branchCode: true,
          deletedAt: true,
        },
      });

    if (!branch) {
      throw new Error(
        "Branch not found."
      );
    }

    if (branch.deletedAt) {
      throw new Error(
        "Branch is already deleted."
      );
    }

    return prisma.branch.update({
      where: {
        branchCode:
          normalizedBranchCode,
      },

      data: {
        deletedAt:
          new Date(),
      },
    });
  };

export const getAllUsers = async ({
  page= 1,
  limit=5,
  search,
  status,
}:GetUsersParams) => {
    const skip = (page - 1) * limit;
    
    const whereCondition = {
      ...(status && {
        isActive: status === "active",
      }),

      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            username: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            email: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
    };

      const [data, total] = await Promise.all([
    prisma.user.findMany({
      where: whereCondition,

      skip,

      take: limit,

      orderBy: {
        createdAt: "desc",
      },


    }),

    prisma.user.count({
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
}

export const getRolesService = async () => {
    return prisma.role.findMany({
      orderBy:{
        name:"asc"
      },
      select:{
        id:true,
        name: true
      }
    });
}

export const getBranchesService = async () => {
    return prisma.branch.findMany({
        where: {
            deletedAt: null,
        },
        orderBy: {
            branchCode: "asc",
        },
        select: {
            branchCode: true,
            companyName: true,
        },
    });
};



export const searchEligibleAgentsService =
  async (search?: string) => {
    const normalizedSearch =
      search?.trim() ?? "";

    if (normalizedSearch.length < 2) {
      return {
        data: [],
      };
    }

    const excludedStatuses: AgentStatus[] = [
      AgentStatus.REJECTED,
      AgentStatus.PENDING,
      AgentStatus.DROPPED,
      AgentStatus.SUSPENDED,
    ];

    const agents =
      await prisma.agent.findMany({
        where: {
          status: {
            notIn: excludedStatuses,
          },

          OR: [
            {
              agentCode: {
                contains: normalizedSearch,
                mode: "insensitive",
              },
            },
            {
              fullName: {
                contains: normalizedSearch,
                mode: "insensitive",
              },
            },
          ],
        },

        take: 20,

        orderBy: {
          fullName: "asc",
        },

        select: {
          id: true,
          agentCode: true,
          fullName: true,
          level: true,
          status: true,
        },
      });

    return {
      data: agents,
    };
  };





export async function createOverrideCommissionRuleService(
  payload: OverrideCommissionRulePayload
) {
  const validated =
    validateOverrideRulePayload(
      payload
    );

  const existingRule =
    await prisma.overrideCommissionRule.findFirst({
      where: {
        receiverLevel:
          validated.receiverLevel,

        sourceLevel:
          validated.sourceLevel,
      },

      select: {
        id: true,
      },
    });

  if (existingRule) {
    throw new Error(
      "An override rule already exists for these levels."
    );
  }

  return prisma.overrideCommissionRule.create({
    data: {
      receiverLevel:
        validated.receiverLevel,

      sourceLevel:
        validated.sourceLevel,

      amount:
        validated.amount,
    },
  });
}

export async function updateOverrideCommissionRuleService(
  id: string,
  payload: OverrideCommissionRulePayload
) {
  const validated =
    validateOverrideRulePayload(
      payload
    );

  const existingRule =
    await prisma.overrideCommissionRule.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
      },
    });

  if (!existingRule) {
    throw new Error(
      "Override commission rule not found."
    );
  }

  const duplicateRule =
    await prisma.overrideCommissionRule.findFirst({
      where: {
        receiverLevel:
          validated.receiverLevel,

        sourceLevel:
          validated.sourceLevel,

        NOT: {
          id,
        },
      },

      select: {
        id: true,
      },
    });

  if (duplicateRule) {
    throw new Error(
      "Another override rule already exists for these levels."
    );
  }

  return prisma.overrideCommissionRule.update({
    where: {
      id,
    },

    data: {
      receiverLevel:
        validated.receiverLevel,

      sourceLevel:
        validated.sourceLevel,

      amount:
        validated.amount,
    },
  });
}

export async function deleteOverrideCommissionRuleService(
  id: string
) {
  const existingRule =
    await prisma.overrideCommissionRule.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
      },
    });

  if (!existingRule) {
    throw new Error(
      "Override commission rule not found."
    );
  }

  await prisma.overrideCommissionRule.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
}