import {
  Cog,
  UserPlus,
  BarChart3,
  FilePlus,
  User,
  ClipboardCheck,
  Repeat,
  CreditCard,
  TrendingUp,
} from "lucide-react";

import { MenuSection } from "@repo/shared";

export const MENU_SECTIONS: MenuSection[] = [
  {
    title: "General",
    items: [
      {
        label: "SSP Operations",
        path: "/",
        icon: Cog,
        permission: "DASHBOARD_ACCESS",
      },
      {
        label: "Agent Administration",
        icon: User,
        permission: "AGENT_VIEW",
        children: [
          {
            label: "Agent Master List",
            path: "/Agents",
            icon: UserPlus,
            permission: "AGENT_VIEW",
          },
          {
            label: "Agent Registration",
            path: "/Registration",
            icon: FilePlus,
            permission: "AGENT_CREATE",
          },
        ],
      },
      {
        label: "Reports & Analytics",
        path: "/Reports",
        icon: BarChart3,
        permission: "REPORT_VIEW",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Reactivation Request",
        path: "/Reactivation",
        icon: ClipboardCheck,
        permission: "AGENT_VIEW",
      },
      {
        label: "Agent Reassignment",
        path: "/Reassignment",
        icon: Repeat,
        permission: "REASSIGNMENT_VIEW",
      },
      {
        label: "Agent Transaction",
        path: "/Transaction",
        icon: CreditCard,
        permission: "TRANSACTION_VIEW",
      },

      {
        label: "Agent Promotions",
        path: "/Promotion",
        icon: TrendingUp,
        permission:"AGENT_VIEW"
      }
    ],
  },
];