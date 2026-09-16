import {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  agentMasterlist,
  agentTransactions,
  getAgentDetails,
  getAllPendingReg,
  getUniqueInfo,
  registerAgent,
  searchAgents,
  searchBranchs,
  updateAgentRegistration,
  agentTransactionsHist,
  readAllNotif,
  droppedOrSuspendedAgentService,
  updateAgentAccountService,
  getAgentRemainingSales,
  updateAdminAccountService,
  updateAgentDetailsService,
  getAgentEditDetailsService,
  getAgentPromotionRecommendationsService,
  updateRecomProm,
  rejectRecomPromotion,
  getAgentMonthlyTransactionCounts,
  createPromotionRecommendationService,
} from "./agents.service";

import {
  PromotionPayload,
  registerAgentApiSchema,
  registrationAgentSchema,
  updateAccSchema,
  updateAdminAccSchema,
  UpdateAgentDetailsPayload,
} from "@repo/shared";
import fs from "fs";

export const searchBranchController = 
    async(
        req:Request,
        res:Response
    ) => {
        try {
            const {search}=
                req.query;

            const result = await searchBranchs(
                typeof search == "string" ? search : undefined
            );
            return res.status(200).json(result);
        } catch (error) {
            console.error(
                "Search Agents Error:",
                error
            );
            return res
            .status(500)
            .json({
            message:
                "Failed to search branches",
            });
        }
    }

export const searchAgentsReactivateController =
 async (
  req:Request,
  res:Response
 ) => {
  try {

      const {
        search,
      } = req.query;

      const result =
        await searchAgents(
          typeof search ===
            "string"
            ? search
            : undefined
        );

      return res
        .status(200)
        .json(result);

    } catch (error) {

      console.error(
        "Search Agents Error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to search agents",
        });
    }
 }

export const searchAgentsController =
  async (
    req: Request,
    res: Response
  ) => {
    try {

      const {
        search,
      } = req.query;

      const result =
        await searchAgents(
          typeof search ===
            "string"
            ? search
            : undefined
        );

      return res
        .status(200)
        .json(result);

    } catch (error) {

      console.error(
        "Search Agents Error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to search agents",
        });
    }
  };



export const checkUniqueInfoController =
  async (
    req: Request,
    res: Response
  ) => {

    try {

      const {
        username,
        email,
        telephone,
      } = req.body;

      const result =
        await getUniqueInfo({
          username,
          email,
          telephone,
        });

      return res.status(200).json({
        message:
          "Unique check completed",
        data: result,
      });

    } catch (error) {

      console.error(
        "CHECK UNIQUE INFO ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to check unique info",
      });
    }
  };

// export const registerAgentController =
//   async (
//     req: Request,
//     res: Response
//   ) => {
//     try {
//       const validatedData =
//         registrationAgentSchema.parse(
//           req.body
//         );

//       const result =
//         await registerAgent(
//           validatedData
//         );

//       return res.status(201).json({
//         success: true,

//         message:
//           "Agent registered successfully",

//         data: result,
//       });
//     } catch (error: unknown) {


//       if (error instanceof AppError) {
//         // Expected business validation.
//         // Do not print a full error stack.
//         console.warn(
//           "REGISTER AGENT VALIDATION:",
//           error.message
//         );

//         return res
//           .status(error.statusCode)
//           .json({
//             success: false,
//             message: error.message,
//           });
//       }

//       console.error(
//         "UNEXPECTED REGISTER AGENT ERROR:",
//         error
//       );

//       return res.status(500).json({
//         success: false,
//         message:
//           "Failed to register agent.",
//       });
//     }
//   };

export const registerAgentController =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            "Profile picture is required.",
        });
      }

      const validatedData =
        registerAgentApiSchema.parse({
          ...req.body,

          dateBirth:
            req.body.dateBirth,

          parentAgentId:
            req.body.parentAgentId ||
            undefined,

          parentAgentName:
            req.body.parentAgentName ||
            undefined,

          uplineLevel:
            req.body.uplineLevel ||
            undefined,

          agentSecTel:
            req.body.agentSecTel ||
            undefined,

          email:
            req.body.email ||
            undefined,
        });

      const profilePhotoPath =
        `/uploads/agent-profile/${req.file.filename}`;

      const result =
        await registerAgent(
          validatedData,
          profilePhotoPath
        );

      return res.status(201).json({
        message:
          "Agent registered successfully",
        data: result,
      });
    } catch (error: unknown) {
      if (req.file) {
        fs.unlink(
          req.file.path,
          () => undefined
        );
      }

      if (error instanceof Error) {
        return res.status(400).json({
          message: error.message,
        });
      }

      return res.status(500).json({
        message:
          "Failed to register agent",
      });
    }
  };


export const getAgentTransactionsController =
  async (
    req: Request,
    res: Response
  ) => {

    try {

      const {
        page,
        limit,
      } = req.query;

      const {
        agentId,
      } = req.params;

      const result =
        await agentTransactions({

          agentId,

          page:
            page
              ? Number(page)
              : 1,

          limit:
            limit
              ? Number(limit)
              : 10,
        });

      return res
        .status(200)
        .json(result);

    } catch (error) {

      console.error(
        "GET AGENT TRANSACTIONS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to fetch transactions",
        });
    }
  };

export const getAgentTransactionsHistController =
  async (
    req: Request,
    res: Response
  ) => {

    try {

      const {
        agentId,
      } = req.params;

      const {
        limit,
        month,
        year,
      } = req.query;

      const result =
        await agentTransactionsHist({
          agentId,

          limit:
            limit
              ? Number(limit)
              : 2,

          month:
            month
              ? Number(month)
              : undefined,

          year:
            year
              ? Number(year)
              : undefined,
        });

      return res
        .status(200)
        .json(result);

    } catch (error) {

      console.error(
        "GET AGENT TRANSACTIONS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to fetch transactions",
        });
    }
  };

export const getMasterlistController = async (
  req:Request,
  res:Response
) =>{
    try {
      const {
        page,
        limit,
        search,
        status,
      } = req.query;


      const result = await agentMasterlist({
        page: page
          ? Number(page)
          : 1,
  
        limit: limit
          ? Number(limit)
          : 10,
  
        search:
          typeof search === "string"
            ? search
            : undefined,
  
        status:
          typeof status === "string"
            ? status
            : undefined,


          });
  
      return res.status(200).json(result);
  
    } catch (error) {
      console.error(
        "Get Agent Error:",
        error
      );
  
      return res.status(500).json({
        message:
          "Failed to fetch agents",
      });
    }
}

export const getAllPendingAgentController = async (
  req:Request,
  res:Response
) =>{
    try {
      const {
        page,
        limit,
        search,
        status,
      } = req.query;

  
      const result = await getAllPendingReg({
        page: page
          ? Number(page)
          : 1,
  
        limit: limit
          ? Number(limit)
          : 10,
  
        search:
          typeof search === "string"
            ? search
            : undefined,
  
        status:
          typeof status === "string"
            ? status
            : undefined,
      });
  
      return res.status(200).json(result);
  
    } catch (error) {
      console.error(
        "Get Agent Error:",
        error
      );
  
      return res.status(500).json({
        message:
          "Failed to fetch agents",
      });
    }
}

export const updateAgentRegistrationController = async(
  req:Request,
  res:Response
) => {
  try {
    const {
      agentId,
      status
    } = req.body;

    const result = await updateAgentRegistration(
      agentId,status
    );

    return res.status(200).json({
      message:
      "Agent status updated successfully",
      data:result,
    })

  }catch(error){
      console.error(
        "UPDATE AGENT STATUS ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update agent status",
      });
  };
};

export const droppedOrSuspendedAgentController = async (
  req: Request,
  res: Response
) => {
  try {

    const {
      agentId,
      status,
    } = req.body;

    if (!agentId) {
      return res.status(400).json({
        message: "Agent ID is required",
      });
    }

    if (
      status !== "DROPPED" &&
      status !== "SUSPENDED"
    ) {
      return res.status(400).json({
        message:
          "Status must be DROPPED or SUSPENDED",
      });
    }

    const result =
      await droppedOrSuspendedAgentService(
        agentId,
        status
      );

    return res.status(200).json({
      message:
        `Agent ${status.toLowerCase()} successfully`,
      data: result,
    });

  }catch(error: any){
  console.error(error);

  return res.status(500).json({
    message: error.message,
  });

  }
};


export const readAllNotifController = async (
  req: Request,
  res: Response
)  => {
  try{
    const {agentId} = req.params

    const result =
      await readAllNotif(
        agentId
      )
    return res.status(200).json({
        success: true,
        updatedCount: result.count,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to update notifications",
      });
    }
};




  export const getAgentDetailsController =
  async (
    req: Request,
    res: Response
  ) => {

    try {

      const { agentId } =
        req.params;

      const result =
        await getAgentDetails(
          agentId
        );

      return res
        .status(200)
        .json(result);

    } catch (error) {

      console.error(
        "GET AGENT DETAILS ERROR:",
        error
      );

      if (
        error instanceof Error
      ) {

        return res
          .status(404)
          .json({
            message:
              error.message,
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to fetch agent details",
        });
    }
  };


  export const updateAgentAccountController =
  async (
    req: Request,
    res: Response
  ) => {
    try {

      const parsed =
        updateAccSchema.safeParse(
          req.body
        );

      if (!parsed.success) {
        return res.status(400).json({
          errors:
            parsed.error.flatten(),
        });
      }

      const userId =
        (req as any).user.id;

      const result =
        await updateAgentAccountService(
          userId,
          parsed.data
        );

      return res.status(200).json({
        message:
          "Account updated successfully",
        data: result,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        message:
          "Failed to update account",
      });
    }
  };

  export const updateAdminAccountController =
  async (
    req: Request,
    res: Response
  ) => {
    try {

      const parsed =
        updateAdminAccSchema.safeParse(
          req.body
        );

      if (!parsed.success) {
        return res.status(400).json({
          errors:
            parsed.error.flatten(),
        });
      }

      const userId =
        (req as any).user.id;

      const result =
        await updateAdminAccountService(
          userId,
          parsed.data
        );

      return res.status(200).json({
        message:
          "Account updated successfully",
        data: result,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        message:
          "Failed to update account",
      });
    }
  };


export const getRemainingSalesController =
  async (
    req: Request,
    res: Response
  ) => {

    try {

      const { agentId } =
        req.params;

      const result =
        await getAgentRemainingSales(
          agentId
        );

      return res.status(200).json(
        result
      );

    } catch (error) {

      return res.status(500).json({
        message:
          "Failed to get remaining sales",
      });
    }
  };







  
  // Edit Agent 


  export async function getAgentEditDetailsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      agentId,
    } =
      req.params;

    if (!agentId) {
      return res.status(400).json({
        message:
          "Agent ID is required.",
      });
    }

    const agent =
      await getAgentEditDetailsService(
        agentId
      );

    return res.status(200).json(
      agent
    );
  } catch (error) {
    next(error);
  }
}


export async function updateAgentDetailsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      agentId,
    } =
      req.params;

    if (!agentId) {
      return res.status(400).json({
        message:
          "Agent ID is required.",
      });
    }

    const payload: UpdateAgentDetailsPayload = {
      fullName:
        req.body.fullName,

      username:
        req.body.username ??
        null,

      level:
        req.body.level,

      gender:
        req.body.gender ??
        null,

      birthDate:
        req.body.birthDate ??
        null,

      address:
        req.body.address ??
        null,

      email:
        req.body.email ??
        null,

      telephone:
        req.body.telephone ??
        null,

      secondaryTel:
        req.body.secondaryTel ??
        null,

      newUplineId:
        req.body.newUplineId ??
        null,
    };

    const updatedAgent =
      await updateAgentDetailsService(
        agentId,
        payload
      );

    return res.status(200).json({
      message:
        "Agent information updated successfully.",

      data:
        updatedAgent,
    });
  } catch (error) {
    next(error);
  }
}


export const getAgentPromotionRecommendationsController =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result =
        await getAgentPromotionRecommendationsService({
          page:
            req.query.page
              ? Number(req.query.page)
              : 1,

          limit:
            req.query.limit
              ? Number(req.query.limit)
              : 10,

          search:
            typeof req.query.search === "string"
              ? req.query.search
              : undefined,

          status:
            typeof req.query.status === "string"
              ? req.query.status
              : undefined,
        });

      return res.status(200).json({
        success: true,
        message:
          "Promotion recommendations fetched successfully.",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };






  export async function updateRecomPromController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { RecomId } = req.params;

    if (!RecomId) {
      return res.status(400).json({
        success: false,
        message:
          "Recommendation ID is required.",
      });
    }

    const payload: PromotionPayload = {
      PromotedTo:
        req.body.PromotedTo,

      newUplineId:
        req.body.newUplineId ??
        null,
    };

    if (!payload.PromotedTo) {
      return res.status(400).json({
        success: false,
        message:
          "Promotion level is required.",
      });
    }

    const result =
      await updateRecomProm(
        RecomId,
        payload
      );

    return res.status(200).json({
      success: true,
      message:
        "Agent recommendation promoted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}


export async function rejectRecomPromController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      RecomId,
    } = req.params;

    const {
      remarks,
    } = req.body;

    if (!RecomId) {
      return res.status(400).json({
        message:
          "Recommendation ID is required.",
      });
    }

    if (
      !remarks ||
      !remarks.trim()
    ) {
      return res.status(400).json({
        message:
          "Rejection reason is required.",
      });
    }

    const rejectedRecommendation =
      await rejectRecomPromotion(
        RecomId,
        remarks
      );

    return res.status(200).json({
      success: true,
      message:
        "Promotion recommendation rejected successfully.",
      data:
        rejectedRecommendation,
    });
  } catch (error) {
    next(error);
  }
}



// Function to fetch agent transaction in agent webpage account 

export const getAgentMonthlyTransactionCountsController =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const {
        agentId,
      } = req.params;

      const year =
        req.query.year
          ? Number(
              req.query.year
            )
          : undefined;

      const result =
        await getAgentMonthlyTransactionCounts(
          agentId,
          year
        );

      return res
        .status(200)
        .json({
          success: true,
          data: result,
        });
    } catch (error) {
      next(error);
    }
  };

  

// Agent Recommendation Button from Upline Downlines 
export const createPromotionRecommendationController =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId =
        (req as any).user.id;

      const {
        agentId,
        remarks,
      } = req.body;

      if (!agentId) {
        return res.status(400).json({
          success: false,
          message:
            "Agent ID is required.",
        });
      }

      const result =
        await createPromotionRecommendationService(
          agentId,
          userId,
          remarks
        );

      return res.status(201).json({
        success: true,
        message:
          "Agent recommended for promotion successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };