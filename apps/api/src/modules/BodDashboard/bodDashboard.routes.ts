import {
  Router,
} from "express";

import {
  getAgentManagementController,
  getBodDashboardOverviewController,
  getCommissionPayoutsTrendController,
  getLoanCommissionTrendController
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
 
router.get(
  "/commission-payouts-trend",
  getCommissionPayoutsTrendController
);

router.get(
  "/loan-commission-trend",
  getLoanCommissionTrendController
);


export default router;