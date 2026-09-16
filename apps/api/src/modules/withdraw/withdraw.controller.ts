import { Request, Response, NextFunction } from "express";
import { createMyWithdrawalRequestService, uploadWithdrawalReceiptService } from "./withdraw.service";


export const createMyWithdrawalRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.id;

    const result =
      await createMyWithdrawalRequestService(
        userId,
        req.body
      );

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};



export const uploadWithdrawalReceiptController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { withdrawalId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Receipt image is required.",
      });
    }

    const result =
      await uploadWithdrawalReceiptService(
        withdrawalId,
        req.file.filename
      );

    return res.status(200).json({
      success: true,
      message:
        "Withdrawal receipt uploaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};