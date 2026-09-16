
import { maintenanceResetCron }
  from "./maintenanceReset.cron";

import { dailyClientStatusCron, maintenanceWarningCron }
  from "./maintenanceWarning.cron";

import { maintenanceReactivationCron }
  from "./maintenance.Reactivation";

import {
  processMaintenanceCycles
} from "./maintenance.processor";

import {
  processMaintenanceWarnings,
  processNewClientsToPending
} from "./maintenanceWarning.processor";

import {
  processProbationRequests
} from "./maintenanceWarning.processor";

export const initializeCrons =
  async () => {

    try {

      // Recover missed maintenance cycles
      await processMaintenanceCycles();

      // Recover missed warning notifications
      await processMaintenanceWarnings();

      // Recover missed probation processing
      await processProbationRequests();

      // Recover missed client status updates
      await processNewClientsToPending();


      maintenanceResetCron.start();

      maintenanceWarningCron.start();

      maintenanceReactivationCron.start();

      dailyClientStatusCron.start();

      console.log(
        "Cron jobs initialized."
      );

    } catch (error) {

      console.error(
        "Cron initialization failed:",
        error
      );
    }
  };