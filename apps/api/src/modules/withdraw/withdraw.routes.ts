import { Router } from "express";
import { authenticateToken } from "../auth/auth.middleware";
import {
  createMyWithdrawalRequestController,
  uploadWithdrawalReceiptController,
} from "./withdraw.controller";
import { uploadWithdrawalReceipt } from "./utils/uploadReceipt.middleware";

const router = Router();

router.post(
  "/my",
  authenticateToken,
  createMyWithdrawalRequestController
);

router.post(
  "/:withdrawalId/receipt",
  uploadWithdrawalReceipt.single("receipt"),
  uploadWithdrawalReceiptController
);

export default router;