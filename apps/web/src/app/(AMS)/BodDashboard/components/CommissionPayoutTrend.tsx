
"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface CommissionPayoutData {
  month: string;
  payout: number;
}

interface CommissionPayoutsTrendProps {
  data: CommissionPayoutData[];
  isLoading?: boolean;
}

const formatAxisMoney = (value: number) => {
  if (value >= 1_000_000) {
    return `₱${(value / 1_000_000).toFixed(0)}M`;
  }

  if (value >= 1_000) {
    return `₱${(value / 1_000).toFixed(0)}K`;
  }

  return `₱${value}`;
};

const formatMoney = (value: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export default function CommissionPayoutsTrend({
  data,
  isLoading = false,
}: CommissionPayoutsTrendProps) {
  const maxValue = Math.max(
    0,
    ...data.map((item) => item.payout)
  );

  const axisMax = Math.max(
    1_000_000,
    Math.ceil(maxValue / 1_000_000) * 1_000_000
  );

  return (
    <div
      className="
        w-full
        rounded-2xl
        bg-white
        p-custom-24
        shadow-sm
      "
    >
      <div className="mb-6">
        <h2
          className="
            text-lg
            font-bold
            text-mainPrimary
          "
        >
          Commission Payouts Trend
        </h2>
      </div>

      {isLoading ? (
        <div className="flex h-75 items-center justify-center text-sm text-neutralPrimary">
          Loading commission payouts...
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-75 items-center justify-center text-sm text-neutralPrimary">
          No commission payout data found.
        </div>
      ) : (
        <div className="h-75 w-full sm:h-85">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={data}
              margin={{
                top: 8,
                right: 12,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient
                  id="commissionPayoutGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#2B78BF"
                    stopOpacity={0.14}
                  />
                  <stop
                    offset="100%"
                    stopColor="#2B78BF"
                    stopOpacity={0.06}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="#E5E7EB"
                strokeWidth={1}
              />

              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{
                  fill: "#666666",
                  fontSize: 12,
                }}
                tickMargin={12}
              />

              <YAxis
                domain={[0, axisMax]}
                tickCount={10}
                tickFormatter={formatAxisMoney}
                tickLine={false}
                axisLine={false}
                width={52}
                tick={{
                  fill: "#666666",
                  fontSize: 12,
                }}
              />

              <Tooltip
                formatter={(value) => [
                  formatMoney(Number(value ?? 0)),
                  "Commission Payout",
                ]}
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#FFFFFF",
                }}
              />

              <Area
                type="monotone"
                dataKey="payout"
                stroke="#2B78BF"
                strokeWidth={3}
                fill="url(#commissionPayoutGradient)"
                dot={{
                  r: 3,
                  strokeWidth: 1.5,
                  stroke: "#2B78BF",
                  fill: "#FFFFFF",
                }}
                activeDot={{
                  r: 6,
                  fill: "#2B78BF",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
                isAnimationActive
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
