import { Router} from 'express';


import loginRoutes from "../modules/login/login.routes"
import clientsRoutes from "../modules/clients/clients.routes"
import agentsRoutes from "../modules/agents/agents.routes"
import generalRoutes from "../modules/general/general.routes"
import commissionRoutes from "../modules/commission/commission.routes"
import reactivateRoutes from "../modules/reactivate/reactivate.routes"
import reassignmentRoutes from "../modules/reassignment/reassignment.routes"

import transactionsRoutes from "../modules/transactions/transactions.routes"
import { errorMiddleware } from "../middleware/error.middleware";
import withdrawalRoutes from "../modules/withdraw/withdraw.routes";
import reportsRoutes from "../modules/reports/reports.routes";
import permissionRoutes from "../modules/permissions/permissions.routes";

const router = Router();



router.use("/auth", loginRoutes);
router.use("/clients", clientsRoutes);
router.use("/agents",agentsRoutes);
router.use("/general", generalRoutes);
router.use("/commission",commissionRoutes);
router.use("/reactivation",reactivateRoutes);
router.use("/reassignment",reassignmentRoutes);
router.use("/transactions",transactionsRoutes);
router.use("/withdrawals", withdrawalRoutes);
router.use("/reports", reportsRoutes);
router.use("/permissions", permissionRoutes);
router.use(errorMiddleware);

export default router;