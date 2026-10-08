import {
  ReactNode,
} from "react";

import Sparkline
  from "./Sparkline";


interface DashboardMetricCardProps {
  title: string;

  value: string;

  subtitle: string;

  trend?: number[];

  icon?: ReactNode;

  accent?:
    | "primary"
    | "positive";
}


export default function DashboardMetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  accent = "primary",
}: DashboardMetricCardProps) {

  const border =
    accent === "positive"
      ? "border-l-positive"
      : "border-l-mainPrimary";


  return (
    <div
      className={`
        min-h-44
        rounded-xl
        border
        border-neutralMed
        border-l-4
        ${border}
        bg-white
        p-custom-24
        shadow-sm
        flex
        flex-col
        justify-between
      `}
    >

      <div
        className="
          flex
          items-start
          justify-between
        "
      >

        <p
          className="
            text-xs
            font-semibold
            uppercase
            tracking-wide
            text-neutralPrimary
          "
        >
          {title}
        </p>


        {icon}

      </div>


      <div>
        <h2
          className="
            text-3xl
            font-bold
            text-mainPrimary
          "
        >
          {value}
        </h2>


        <p
          className="
            mt-custom-8
            text-xs
            font-semibold
            text-positive
          "
        >
          {subtitle}
        </p>
      </div>


      {trend && (
        <div
          className="
            mt-custom-16
            text-mainPrimary
          "
        >
          <Sparkline
            data={trend}
          />
        </div>
      )}

    </div>
  );
}