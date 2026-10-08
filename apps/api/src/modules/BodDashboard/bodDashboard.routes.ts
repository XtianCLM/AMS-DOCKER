import {
  Router,
} from "express";

import {
  getAgentManagementController,
  getBodDashboardOverviewController,
} from "./bodDashboard.controller";


const router =
  Router();


router.get(
  "/overview",
  getBodDashboardOverviewController
);

router.get(
  "/agents",
  getAgentManagementController
);


export default router;