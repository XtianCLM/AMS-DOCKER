
"use client";

import { useMemo } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// =====================================================
// TYPES
// =====================================================

export interface LoanCommissionChartData {
  month: string;
  loanDisbursementAmount: number;
  commissions: number;
}

interface Props {
  data: LoanCommissionChartData[];
  isLoading?: boolean;
}

// =====================================================
// FORMATTERS
// =====================================================

const formatPeso = (value: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatMillions = (value: number) => {
  return `₱${value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  })}M`;
};

// =====================================================
// AXIS MAXIMUM
// =====================================================

const calculateAxisMaximum = (values: number[]) => {
  const maximum = Math.max(0, ...values);

  if (maximum === 0) {
    return 1;
  }

  const padded = maximum * 1.15;

  const magnitude = Math.pow(
    10,
    Math.floor(Math.log10(padded))
  );

  const normalized = padded / magnitude;

  const niceMaximum =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 5
          ? 5
          : 10;

  return niceMaximum * magnitude;
};

// =====================================================
// COMPONENT
// =====================================================

export default function LoanDisbursementCommissionChart({
  data,
  isLoading = false,
}: Props) {

  // ===================================================
  // CHART DATA
  // ===================================================

  const chartData = useMemo(() => {
    return data.map((item) => ({
      month: item.month,

      loanMillions:
        Number(item.loanDisbursementAmount ?? 0) /
        1_000_000,

      commissionsMillions:
        Number(item.commissions ?? 0) /
        1_000_000,
    }));
  }, [data]);

  // ===================================================
  // DYNAMIC AXIS LIMITS
  // ===================================================

  const loanAxisMax = useMemo(() => {
    return calculateAxisMaximum(
      chartData.map((item) => item.loanMillions)
    );
  }, [chartData]);

  const commissionAxisMax = useMemo(() => {
    return calculateAxisMaximum(
      chartData.map(
        (item) => item.commissionsMillions
      )
    );
  }, [chartData]);

  const hasValues = chartData.some(
    (item) =>
      item.loanMillions > 0 ||
      item.commissionsMillions > 0
  );

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <section
      className="
        w-full
        min-w-0
        rounded-2xl
        border
        border-neutralMed
        bg-white
        p-custom-24
        shadow-sm
      "
    >

      {/* ============================================= */}
      {/* HEADER */}
      {/* ============================================= */}

      <div
        className="
          mb-custom-24
          flex
          flex-col
          gap-custom-8
        "
      >
        <h2
          className="
            text-mdHeader
            font-bold
            text-mainPrimary
          "
        >
          Loan Sales vs Commission Payouts
        </h2>

        <p
          className="
            text-xs
            text-neutralPrimary
          "
        >
          Monthly comparison of client loan sales
          and agent commissions.
        </p>
      </div>

      {/* ============================================= */}
      {/* LOADING */}
      {/* ============================================= */}

      {isLoading ? (

        <div
          className="
            flex
            h-85
            w-full
            items-center
            justify-center
          "
        >
          <div
            className="
              flex
              flex-col
              items-center
              gap-custom-16
            "
          >
            <div
              className="
                h-8
                w-8
                animate-spin
                rounded-full
                border-4
                border-neutralMed
                border-t-mainPrimary
              "
            />

            <p className="text-sm text-neutralPrimary">
              Loading loan and commission data...
            </p>
          </div>
        </div>

      ) : !data.length || !hasValues ? (

        /* =========================================== */
        /* EMPTY */
        /* =========================================== */

        <div
          className="
            flex
            h-85
            w-full
            flex-col
            items-center
            justify-center
            gap-custom-8
            text-neutralPrimary
          "
        >
          <p className="text-sm font-semibold">
            No loan or commission data found.
          </p>

          <p className="text-xs">
            No recorded transactions for the selected year.
          </p>
        </div>

      ) : (

        /* =========================================== */
        /* CHART */
        /* =========================================== */

        <div className="h-85 w-full min-w-0 sm:h-100">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={chartData}
              margin={{
                top: 15,
                right: 10,
                left: 10,
                bottom: 5,
              }}
              barGap={5}
              barCategoryGap="20%"
            >

              {/* ===================================== */}
              {/* GRID */}
              {/* ===================================== */}

              <CartesianGrid
                stroke="#E5E7EB"
                strokeDasharray="3 3"
                vertical={false}
              />

              {/* ===================================== */}
              {/* X AXIS */}
              {/* ===================================== */}

              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tickMargin={12}
                tick={{
                  fontSize: 12,
                  fill: "#6B7280",
                }}
              />

              {/* ===================================== */}
              {/* LEFT Y AXIS - LOAN SALES */}
              {/* ===================================== */}

              <YAxis
                yAxisId="loans"
                orientation="left"
                domain={[0, loanAxisMax]}
                tickCount={6}
                axisLine={false}
                tickLine={false}
                width={65}
                tickFormatter={formatMillions}
                tick={{
                  fontSize: 11,
                  fill: "#2B78BF",
                }}
              />

              {/* ===================================== */}
              {/* RIGHT Y AXIS - COMMISSIONS */}
              {/* ===================================== */}

              <YAxis
                yAxisId="commissions"
                orientation="right"
                domain={[0, commissionAxisMax]}
                tickCount={6}
                axisLine={false}
                tickLine={false}
                width={65}
                tickFormatter={formatMillions}
                tick={{
                  fontSize: 11,
                  fill: "#1C7C36",
                }}
              />

              {/* ===================================== */}
              {/* TOOLTIP */}
              {/* ===================================== */}

              <Tooltip
                cursor={{
                  fill: "#F6F6F6",
                }}
                formatter={(value, name) => {
                  const amount =
                    Number(value ?? 0) * 1_000_000;

                  return [
                    formatPeso(amount),
                    String(name),
                  ];
                }}
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #D9D9D9",
                  borderRadius: "12px",
                  boxShadow:
                    "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: "12px",
                }}
                labelStyle={{
                  color: "#0F2A5F",
                  fontWeight: 700,
                }}
              />

              {/* ===================================== */}
              {/* LEGEND */}
              {/* ===================================== */}

              <Legend
                verticalAlign="top"
                align="center"
                iconType="square"
                iconSize={10}
                wrapperStyle={{
                  paddingBottom: "18px",
                  fontSize: "12px",
                }}
              />

              {/* ===================================== */}
              {/* LOAN SALES BAR */}
              {/* ===================================== */}

              <Bar
                yAxisId="loans"
                dataKey="loanMillions"
                name="Loan Sales"
                fill="#2B78BF"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                minPointSize={2}
                isAnimationActive
                animationDuration={700}
              />

              {/* ===================================== */}
              {/* COMMISSION BAR */}
              {/* ===================================== */}

              <Bar
                yAxisId="commissions"
                dataKey="commissionsMillions"
                name="Commissions"
                fill="#1C7C36"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                minPointSize={2}
                isAnimationActive
                animationDuration={900}
              />

            </BarChart>

          </ResponsiveContainer>

        </div>
      )}

      {/* ============================================= */}
      {/* FOOTER LEGEND DESCRIPTION */}
      {/* ============================================= */}

      {!isLoading && hasValues && (

        <div
          className="
            mt-custom-16
            flex
            flex-wrap
            items-center
            justify-center
            gap-custom-24
            border-t
            border-neutralMed
            pt-custom-16
          "
        >

          <div className="flex items-center gap-custom-8">
            <span
              className="
                h-3
                w-3
                rounded-sm
                bg-[#2B78BF]
              "
            />

            <span className="text-xs text-neutralPrimary">
              Loan Sales (₱ Millions)
            </span>
          </div>

          <div className="flex items-center gap-custom-8">
            <span
              className="
                h-3
                w-3
                rounded-sm
                bg-[#1C7C36]
              "
            />

            <span className="text-xs text-neutralPrimary">
              Commissions (₱ Millions)
            </span>
          </div>

        </div>

      )}

    </section>
  );
}
