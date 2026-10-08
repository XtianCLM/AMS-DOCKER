"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface AgentStatusChartProps {
  data: {
    name: string;
    value: number;
  }[];
}

const STATUS_COLORS: Record<
  string,
  string
> = {
  ACTIVE:
    "#15803d",

  EXPIRED:
    "#d97706",

  SUSPENDED:
    "#dc2626",

  DROPPED:
    "#64748b",

  REMOVE:
    "#334155",

  PENDING:
    "#2563eb",

  NEW:
    "#0ea5e9",
};

const formatStatus = (
  status: string
) => {
  return status
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};

export default function AgentStatusChart({
  data,
}: AgentStatusChartProps) {
  const formattedData =
    data.map(
      (item) => ({
        ...item,
        displayName:
          formatStatus(
            item.name
          ),
      })
    );

  const total =
    data.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.value,
      0
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
          Agent Status Distribution
        </h2>

        <p
          className="
            mt-1
            text-xs
            text-neutralPrimary
          "
        >
          Current agent population by account status.
        </p>
      </div>

      <div
        className="
          relative
          h-75
          w-full
        "
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <PieChart>
            <Pie
              data={
                formattedData
              }
              dataKey="value"
              nameKey="displayName"
              cx="50%"
              cy="45%"
              innerRadius={70}
              outerRadius={120}
              paddingAngle={1}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {formattedData.map(
                (
                  item
                ) => (
                  <Cell
                    key={
                      item.name
                    }
                    fill={
                      STATUS_COLORS[
                        item.name
                      ] ??
                      "#94a3b8"
                    }
                  />
                )
              )}
            </Pie>

            <Tooltip
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

            <Legend
              verticalAlign="bottom"
              height={36}
            />
          </PieChart>
        </ResponsiveContainer>

        <div
          className="
            pointer-events-none
            absolute
            left-1/2
            top-[45%]
            -translate-x-1/2
            -translate-y-1/2
            text-center
          "
        >
          <p
            className="
              text-xs
              uppercase
              tracking-wide
              text-neutralPrimary
            "
          >
            Total
          </p>

          <p
            className="
              text-2xl
              font-bold
              text-mainPrimary
            "
          >
            {total.toLocaleString(
              "en-PH"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}