// // maintenanceReset.cron.ts

// import cron from "node-cron";

// import prisma from "../lib/prisma";

// import {
//   emitNotification,
// } from "../socket/socketEmitter";

// export const maintenanceResetCron =
//   cron.schedule(
//     "0 0 1 * *",
//     async () => {

//       console.log(
//         "Running maintenance reset cron..."
//       );

//       const now = new Date();

//       /* =========================
//          PREVIOUS MONTH
//       ========================= */
//       const previousMonthDate =
//         new Date(
//           now.getFullYear(),
//           now.getMonth() - 1,
//           1
//         );

//       const previousMonth =
//         previousMonthDate.getMonth() + 1;

//       const previousYear =
//         previousMonthDate.getFullYear();

//       /* =========================
//          GET ACTIVE CYCLES
//       ========================= */
//       const activeCycles =
//         await prisma.agentMaintenanceCycle.findMany({

//           where: {

//             cycleMonth:
//               previousMonth,

//             cycleYear:
//               previousYear,

//             status:
//               "ACTIVE",
//           },

//           include: {
//             agent: true,
//           },
//         });

//       for (const cycle of activeCycles) {

//         const completed =
//           cycle.completedSales >=
//           cycle.requiredSales;

//         /* =========================
//            COMPLETE
//         ========================= */
//         if (completed) {

//           await prisma.agentMaintenanceCycle.update({

//             where: {
//               id: cycle.id,
//             },

//             data: {

//               status:
//                 "COMPLETED",

//               isCompleted:
//                 true,

//               completedAt:
//                 new Date(),
//             },
//           });

//           /* =========================
//              RESTORE AGENT STATUS
//           ========================= */
//           await prisma.agent.update({

//             where: {
//               id: cycle.agentId,
//             },

//             data: {
//               status: "ACTIVE",

//               consecutiveMonthsActive: {
//                 increment: 1,
//               },
//             },
//           });

//           /* =========================
//              CREATE NOTIFICATION
//           ========================= */
//           const notification =
//             await prisma.agentNotification.create({

//               data: {

//                 agentId:
//                   cycle.agentId,

//                 type:
//                   "MAINTENANCE_COMPLETED",

//                 title:
//                   "Maintenance Completed",

//                 message:
//                   "You successfully completed your sales maintenance.",
//               },
//             });

//           /* =========================
//              REALTIME SOCKET
//           ========================= */
//           emitNotification(
//             cycle.agentId,
//             notification
//           );
//         }

//         /* =========================
//            EXPIRED
//         ========================= */
//         else {

//           await prisma.agentMaintenanceCycle.update({

//             where: {
//               id: cycle.id,
//             },

//             data: {

//               status:
//                 "EXPIRED",

//               expiredAt:
//                 new Date(),
//             },
//           });

//           /* =========================
//              EXPIRE AGENT
//           ========================= */
//           await prisma.agent.update({

//             where: {
//               id: cycle.agentId,
//             },

//             data: {
//               status: "EXPIRED",
//               consecutiveMonthsActive: 0,
//             },
//           });

//           /* =========================
//              CREATE NOTIFICATION
//           ========================= */
//           const notification =

//             await prisma.agentNotification.create({

//               data: {

//                 agentId:
//                   cycle.agentId,

//                 type:
//                   "MAINTENANCE_EXPIRED",

//                 title:
//                   "Maintenance Expired",

//                 message:
//                   "You failed to complete your required sales maintenance.",
//               },
//             });

//           /* =========================
//              REALTIME SOCKET
//           ========================= */
//           emitNotification(
//             cycle.agentId,
//             notification
//           );
//         }

//         /* =========================
//            NEXT MONTH
//         ========================= */
//         const nextMonthDate =
//           new Date(
//             now.getFullYear(),
//             now.getMonth(),
//             1
//           );

//         const nextMonth =
//           nextMonthDate.getMonth() + 1;

//         const nextYear =
//           nextMonthDate.getFullYear();

//         /* =========================
//            CHECK EXISTING CYCLE
//         ========================= */
//         const existingCycle =
//           await prisma.agentMaintenanceCycle.findFirst({

//             where: {

//               agentId:
//                 cycle.agentId,

//               cycleMonth:
//                 nextMonth,

//               cycleYear:
//                 nextYear,
//             },
//           });

//         /* =========================
//            CREATE NEW CYCLE
//         ========================= */
//         if (!existingCycle) {

//           await prisma.agentMaintenanceCycle.create({

//             data: {

//               agentId:
//                 cycle.agentId,

//               cycleMonth:
//                 nextMonth,

//               cycleYear:
//                 nextYear,

//               cycleStartDate:
//                 new Date(
//                   nextYear,
//                   nextMonth - 1,
//                   1
//                 ),

//               cycleEndDate:
//                 new Date(
//                   nextYear,
//                   nextMonth,
//                   0
//                 ),

//               requiredSales: 1,

//               completedSales: 0,

//               remainingSales: 1,

//               isCompleted: false,

//               status: "ACTIVE",
//             },
//           });
//         }
//       }

//       console.log(
//         "Maintenance reset completed."
//       );
//     }
//   );


import cron from "node-cron";

import {
  processMaintenanceCycles,
} from "./maintenance.processor";

export const maintenanceResetCron =
  cron.schedule(
     "0 0 * * *",
    async () => {

      try {

        await processMaintenanceCycles();

      } catch (error) {

        console.error(
          "Maintenance Cron Error:",
          error
        );
      }
    },
    {
    timezone: "Asia/Manila",
    }
  );