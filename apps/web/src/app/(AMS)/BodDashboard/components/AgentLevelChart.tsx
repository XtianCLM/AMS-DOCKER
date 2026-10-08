"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AgentLevelChartProps {
  data: {
    level: string;
    value: number;
  }[];
}

const LEVEL_ORDER: Record<
  string,
  number
> = {
  L1: 1,
  L2: 2,
  L3: 3,
};

export default function AgentLevelChart({
  data,
}: AgentLevelChartProps) {
  const sortedData =
    [...data].sort(
      (
        first,
        second
      ) =>
        (
          LEVEL_ORDER[
            first.level
          ] ??
          99
        ) -
        (
          LEVEL_ORDER[
            second.level
          ] ??
          99
        )
    );

  return (
    <div
      className="
        h-full
        min-h-96
        rounded-2xl
        border
        border-neutralMed
        bg-white
        p-custom-24
        shadow-sm
      "
    >
      <div
        className="
          mb-custom-16
        "
      >
        <h2
          className="
            text-base
            font-bold
            text-mainPrimary
          "
        >
          Agent Level Distribution
        </h2>

        <p
          className="
            mt-1
            text-xs
            text-neutralPrimary
          "
        >
          Number of agents assigned to each level.
        </p>
      </div>

      <div
        className="
          h-75
          w-full
        "
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <BarChart
            data={
              sortedData
            }
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              opacity={0.3}
            />

            <XAxis
              dataKey="level"
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip
              cursor={{
                fill:
                  "rgba(0,0,0,0.03)",
              }}
              formatter={(
                value
              ) => [
                Number(
                  value
                ).toLocaleString(
                  "en-PH"
                ),
                "Agents",
              ]}
            />

            <Bar
              dataKey="value"
              name="Agents"
              fill="#337ab7"
              radius={[
                6,
                6,
                0,
                0,
              ]}
              maxBarSize={130}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}