import {
  Request,
  Response,
} from "express";

import {
  DashboardPeriod,
  AgentManagementLevel,
  AgentManagementStatus,
} from "@repo/shared";

import {
  getAgentManagementService,
  getBodDashboardOverview,
} from "./bodDashboard.service";


const allowedPeriods:
  DashboardPeriod[] = [
    "DAILY",
    "WEEKLY",
    "MONTHLY",
    "ANNUAL",
  ];


export const getBodDashboardOverviewController =
  async (
    req: Request,
    res: Response
  ) => {

    try {

      const rawPeriod =
        String(
          req.query.period ??
          "MONTHLY"
        ).toUpperCase();


      if (
        !allowedPeriods.includes(
          rawPeriod as DashboardPeriod
        )
      ) {

        return res
          .status(400)
          .json({
            message:
              "Invalid dashboard period.",
          });
      }


      const period =
        rawPeriod as DashboardPeriod;


      const company =
        String(
          req.query.company ??
          "ALL"
        );


      const branch =
        String(
          req.query.branch ??
          "ALL"
        );


      const result =
        await getBodDashboardOverview({
          period,
          company,
          branch,
        });


      return res
        .status(200)
        .json(result);

    } catch (error) {

      console.error(
        "GET BOD DASHBOARD ERROR:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            error instanceof Error
              ? error.message
              : "Failed to retrieve dashboard.",
        });
    }
  };



























export const getAgentManagementController =
  async (
    req: Request,
    res: Response
  ) => {

    try {

      const page =
        Number(
          req.query.page ??
          1
        );


      const pageSize =
        Number(
          req.query.pageSize ??
          10
        );


      const company =
        String(
          req.query.company ??
          "ALL"
        );

      const branch =
        String(
          req.query.branch ??
          "ALL"
        );

      const level =
        String(
          req.query.level ??
          "ALL"
        ) as AgentManagementLevel;


      const status =
        String(
          req.query.status ??
          "ALL"
        ) as AgentManagementStatus;


      const period =
        String(
          req.query.period ??
          "MONTHLY"
        ) as DashboardPeriod;


      const result =
        await getAgentManagementService({
          page,
          pageSize,
          company,
          branch,
          level,
          status,
          period,
        });


      return res
        .status(200)
        .json(result);

    } catch (error) {

      console.error(
        "GET AGENT MANAGEMENT ERROR:",
        error
      );


      return res
        .status(500)
        .json({
          message:
            error instanceof Error
              ? error.message
              : "Unable to load agents.",
        });
    }
  };