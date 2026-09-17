import { Request, Response } from "express";

import { getAllClients, getCommissionDetails, importClientsFromDbf } from "./clients.service";

export const getAllClientsController = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      page,
      limit,
      search,
      status,
    } = req.query;

    console.log(req.query);

    const result = await getAllClients({
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
      "Get Clients Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch clients",
    });
  }
};

export const getCommissionDetailsController = async (
  req:Request,
  res:Response
) => {
  try{
    const {clientId} = req.params

    if(!clientId){
      return res.status(400).json({
        message: "Client ID is required",
      });
    };

    const result =
      await getCommissionDetails(
        clientId
      );

      return res.status(200).json(result);

  }catch(error){
       console.error(
      "Get Commission Details Error:",
      error
    );

    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch commission details",
    });
  }
}



// -----------------------------------------------------
// IMPORT DBF CLIENTS
// -----------------------------------------------------

export const importClientsDbfController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({
          message:
            "DBF file is required.",
        });
    }

    const userId =
      (req as any).user.id;

    const result =
      await importClientsFromDbf({
        buffer:
          req.file.buffer,

        uploadedById:
          userId,
      });

    return res
      .status(201)
      .json({
        message:
          "Client data imported successfully.",

        ...result,
      });

  } catch (error) {
    console.error(
      "Import DBF Error:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to import DBF file.",
      });
  }
};