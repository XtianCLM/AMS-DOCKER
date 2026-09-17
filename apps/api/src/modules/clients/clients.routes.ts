import {
  Router
} from "express";

import {
  getAllClientsController,
  getCommissionDetailsController,
  importClientsDbfController,
} from "./clients.controller";

import {
  uploadDbf
} from "../../middleware/uploadDbf";
import { authenticateToken } from "../auth/auth.middleware";


const router = Router();


router.post(
  "/getClients",
  getAllClientsController
);


router.get(
  "/commission/details/:clientId",
  getCommissionDetailsController
);


/*
 * Import clients from DBF
 */
router.post(
  "/import-dbf",
  uploadDbf.single("file"),
  authenticateToken,
  importClientsDbfController
);


export default router;