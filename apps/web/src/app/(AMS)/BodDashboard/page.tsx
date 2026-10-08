"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CircleDollarSign,
  Download,
  Landmark,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react";

import {
  BodDashboardFilters,
  DashboardPeriod,
  ReportType,
} from "@repo/shared";
import { useBodDashboardOverview } from "@/hooks/bodDashboard/useBodDashboard";
import DashboardMetricCard from "./components/DashboardMetricCard";
import AgentStatusChart from "./components/AgentStatusChart";
import AgentLevelChart from "./components/AgentLevelChart";
import TopPerformingAgents from "./components/TopPerformingAgent";
import AgentManagement from "./components/AgentManagement";
import AgentCommissionReport from "../Reports/components/AgentCommissionReport";
import BranchCommissionReport from "../Reports/components/BranchCommissionReport";
import { defaultEndPeriod, defaultStartPeriod } from "../Reports/helper/dateFormat.helper";




// =====================================================
// TEMPORARY COMPANY OPTIONS
//
// Later we can replace these with your real
// Company / Branch API.
// =====================================================

const companies = [
  {
    value: "ALL",
    label: "All Companies",
  },
  {
    value: "EMB",
    label: "EMB",
  },
  {
    value: "PSPMI",
    label: "PSPMI",
  },
];


const branches = [
  {
    value: "ALL",
    label: "All Branches",
  },
  {
    value: "EMB-MAIN",
    label: "EMB Main",
  },
  {
    value: "BR001",
    label: "Branch 001",
  },
];


// =====================================================
// PERIOD BUTTONS
// =====================================================

const periods: {
  label: string;
  value: DashboardPeriod;
}[] = [
  {
    label: "Daily",
    value: "DAILY",
  },
  {
    label: "Weekly",
    value: "WEEKLY",
  },
  {
    label: "Monthly",
    value: "MONTHLY",
  },
  {
    label: "Annual",
    value: "ANNUAL",
  },
];


// =====================================================
// FORMAT DATE
// =====================================================

const formatDate = (
  date: Date
) => {

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
};


// =====================================================
// FRONTEND DATE RANGE
//
// Used only for displaying the selected period.
// Backend still calculates the actual query range.
// =====================================================

const getPeriodRange = (
  period: DashboardPeriod
) => {

  const now =
    new Date();

  let start =
    new Date(now);

  let end =
    new Date(now);


  switch (period) {

    // -------------------------------------------------
    // DAILY
    // -------------------------------------------------

    case "DAILY": {

      start.setHours(
        0,
        0,
        0,
        0
      );

      end.setHours(
        23,
        59,
        59,
        999
      );

      break;
    }


    // -------------------------------------------------
    // WEEKLY
    // Monday -> Sunday
    // -------------------------------------------------

    case "WEEKLY": {

      const day =
        now.getDay();

      const diffToMonday =
        day === 0
          ? -6
          : 1 - day;


      start =
        new Date(now);

      start.setDate(
        now.getDate() +
        diffToMonday
      );

      start.setHours(
        0,
        0,
        0,
        0
      );


      end =
        new Date(start);

      end.setDate(
        start.getDate() + 6
      );

      end.setHours(
        23,
        59,
        59,
        999
      );

      break;
    }


    // -------------------------------------------------
    // MONTHLY
    // -------------------------------------------------

    case "MONTHLY": {

      start =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );


      end =
        new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );

      break;
    }


    // -------------------------------------------------
    // ANNUAL
    // -------------------------------------------------

    case "ANNUAL": {

      start =
        new Date(
          now.getFullYear(),
          0,
          1
        );


      end =
        new Date(
          now.getFullYear(),
          11,
          31,
          23,
          59,
          59,
          999
        );

      break;
    }
  }


  return {
    start,
    end,
  };
};




// =====================================================
// FORMAT NUMBER
// =====================================================

const formatNumber = (
  value: number
) => {

  return value.toLocaleString(
    "en-PH"
  );
};


// =====================================================
// FORMAT PESO
//
// Examples:
//
// 92700000 -> ₱92.7M
// 3800000  -> ₱3.8M
// =====================================================

const formatPesoCompact = (
  value: number
) => {

  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
      notation: "compact",
      maximumFractionDigits: 1,
    }
  ).format(value);
};


// =====================================================
// FORMAT PERCENTAGE CHANGE
// =====================================================

const formatChange = (
  value:
    number |
    undefined
) => {

  if (
    value ===
    undefined
  ) {
    return "No comparison";
  }


  if (value === 0) {
    return "0.0%";
  }


  const arrow =
    value > 0
      ? "↑"
      : "↓";


  return `${arrow} ${Math.abs(
    value
  ).toFixed(1)}%`;
};


// =====================================================
// DASHBOARD
// =====================================================

export default function BodDashboard() {

  // ===================================================
  // FILTER STATE
  // ===================================================

  const [
    filters,
    setFilters,
  ] =
    useState<BodDashboardFilters>({
      period: "MONTHLY",
      company: "ALL",
      branch: "ALL",
    });


  // ===================================================
  // LAST SUCCESSFUL LOAD
  // ===================================================

  // const [
  //   lastUpdated,
  //   setLastUpdated,
  // ] =
  //   useState<Date>(
  //     new Date()
  //   );
  const [startPeriod, setStartPeriod] = useState<string>(defaultStartPeriod);
    
  const [endPeriod, setEndPeriod]= useState<string>(defaultEndPeriod);
    
  const [reportType, setReportType] = useState<ReportType>("AGENT");
    
  const [searchName, setSearchName] = useState("");
    
  const handleGenerateReport = () => {
    if (!startPeriod || !endPeriod) {
      return;
    }

    if (startPeriod > endPeriod) {
      return;
    }

    const params = new URLSearchParams({
      reportType,
      startPeriod,
      endPeriod,
    });

    if (searchName.trim()) {
      params.set(
        "searchName",
        searchName.trim()
      );
    }

    const width = 1200;
    const height = 800;

    const left =
      window.screenX +
      (window.outerWidth - width) / 2;

    const top =
      window.screenY +
      (window.outerHeight - height) / 2;

    window.open(
      `/print/commission-report?${params.toString()}`,
      "CommissionReport",
      `
        width=${width},
        height=${height},
        left=${left},
        top=${top},
        resizable=yes,
        scrollbars=yes
      `
    );
  };

  // ===================================================
  // DISPLAY DATE RANGE
  // ===================================================

  const dateRange =
    useMemo(() => {

      return getPeriodRange(
        filters.period
      );

    }, [
      filters.period,
    ]);


  // ===================================================
  // readable period label
  // ===================================================
  const performancePeriodLabel =
    useMemo(() => {

      switch (
        filters.period
      ) {

        case "DAILY":
          return "today";

        case "WEEKLY":
          return "this week";

        case "MONTHLY":
          return "this month";

        case "ANNUAL":
          return "this year";

        default:
          return "the selected period";
      }

    }, [
      filters.period,
    ]);


  // ===================================================
  // DASHBOARD QUERY
  // ===================================================

  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    isFetching: isDashboardFetching,
    isError: isDashboardError,
    refetch: refetchDashboard,
    dataUpdatedAt,
  } = useBodDashboardOverview(
    filters
  );




  const lastUpdated =
  dataUpdatedAt
    ? new Date(
        dataUpdatedAt
      )
    : null;
  // ===================================================
  // FILTER HANDLERS
  // ===================================================

  const handlePeriodChange = (
    period: DashboardPeriod
  ) => {

    setFilters(
      (
        previous
      ) => ({
        ...previous,
        period,
      })
    );
  };


  const handleCompanyChange = (
    company: string
  ) => {

    setFilters(
      (
        previous
      ) => ({
        ...previous,

        company,

        // Company changed.
        // Reset selected branch.
        branch: "ALL",
      })
    );
  };


  const handleBranchChange = (
    branch: string
  ) => {

    setFilters(
      (
        previous
      ) => ({
        ...previous,
        branch,
      })
    );
  };


  // ===================================================
  // MANUAL REFRESH
  // ===================================================

  const handleRefresh =
    async () => {

      await refetchDashboard();
    };


  // ===================================================
  // EXPORT
  //
  // We will connect this later to PDF / Excel.
  // ===================================================

  const handleExportReport =
    () => {

      console.log(
        "Export dashboard:",
        {
          filters,
          dashboard,
        }
      );
    };


  // ===================================================
  // RETURN
  // ===================================================

  return (

    <div
      className="
        min-h-screen
        w-full
        bg-neutralLight
        px-custom-32
        py-custom-32
      "
    >

      {/* ================================================= */}
      {/* DASHBOARD CONTROLS */}
      {/* ================================================= */}

      <section
        className="
          w-full
          rounded-2xl
          border
          border-neutralMed
          bg-white
          p-custom-32
          shadow-sm
        "
      >

        {/* =============================================== */}
        {/* TOP HEADER */}
        {/* =============================================== */}

        <div
          className="
            flex
            flex-col
            gap-custom-16

            lg:flex-row
            lg:items-start
            lg:justify-between
          "
        >

          {/* LEFT */}

          <div
            className="
              flex
              flex-col
              gap-custom-8
            "
          >

            <h1
              className="
                text-mdHeader
                font-bold
                text-mainPrimary
              "
            >
              Dashboard
            </h1>


            <p
              className="
                text-sm
                text-neutralPrimary
              "
            >
              {formatDate(
                dateRange.start
              )}

              {" – "}

              {formatDate(
                dateRange.end
              )}
            </p>

          </div>


          {/* RIGHT */}

          <div
            className="
              flex
              flex-col
              items-start
              gap-custom-8

              lg:items-end
            "
          >

            <div
              className="
                flex
                items-center
                gap-custom-8
              "
            >

              {/* REFRESH */}

              <button
                type="button"
                onClick={
                  handleRefresh
                }
                disabled={
                  isDashboardFetching
                }
                className="
                  flex
                  items-center
                  justify-center
                  gap-custom-8
                  rounded-lg
                  border
                  border-neutralMed
                  bg-white
                  px-custom-16
                  py-custom-8
                  text-sm
                  font-semibold
                  text-mainPrimary
                  cursor-pointer
                  transition
                  duration-150

                  hover:bg-neutralLight

                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >

                <RefreshCw
                  size={16}
                  className={
                    isDashboardFetching
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh

              </button>


              {/* EXPORT */}

              <button
                type="button"
                onClick={
                  handleExportReport
                }
                className="
                  flex
                  items-center
                  justify-center
                  gap-custom-8
                  rounded-lg
                  bg-positive
                  px-custom-24
                  py-custom-8
                  text-sm
                  font-bold
                  text-white
                  cursor-pointer
                  transition
                  duration-150

                  hover:scale-105
                "
              >

                <Download
                  size={16}
                />

                Export Report

              </button>

            </div>


          <p
            className="
              text-xs
              text-neutralPrimary
            "
          >
            {isDashboardFetching
              ? "Updating dashboard..."
              : lastUpdated
              ? (
                <>
                  Last updated{" "}

                  {lastUpdated.toLocaleTimeString(
                    "en-US",
                    {
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  )}
                </>
              )
              : "Not updated yet"
            }
          </p>

          </div>

        </div>


        {/* =============================================== */}
        {/* CONTROLS */}
        {/* =============================================== */}

        <div
          className="
            mt-custom-32
            flex
            flex-col
            gap-custom-24

            xl:flex-row
            xl:items-end
            xl:justify-between
          "
        >

          {/* ============================================= */}
          {/* TIME PERIOD */}
          {/* ============================================= */}

          <div
            className="
              flex
              flex-col
              gap-custom-8
            "
          >

            <label
              className="
                text-xs
                font-bold
                uppercase
                tracking-wide
                text-neutralPrimary
              "
            >
              Time Period
            </label>


            <div
              className="
                flex
                flex-wrap
                gap-custom-8
              "
            >

              {periods.map(
                (
                  period
                ) => {

                  const isActive =
                    filters.period ===
                    period.value;


                  return (

                    <button
                      key={
                        period.value
                      }
                      type="button"
                      onClick={() =>
                        handlePeriodChange(
                          period.value
                        )
                      }
                      className={`
                        min-w-24
                        rounded-lg
                        border
                        px-custom-16
                        py-custom-8
                        text-sm
                        font-semibold
                        cursor-pointer
                        transition
                        duration-150

                        ${
                          isActive
                            ? `
                              border-mainPrimary
                              bg-mainPrimary
                              text-white
                              shadow-sm
                            `
                            : `
                              border-mainPrimary
                              bg-white
                              text-mainPrimary

                              hover:bg-neutralLight
                            `
                        }
                      `}
                    >

                      {
                        period.label
                      }

                    </button>

                  );
                }
              )}

            </div>

          </div>


          {/* ============================================= */}
          {/* COMPANY + BRANCH */}
          {/* ============================================= */}

          <div
            className="
              grid
              grid-cols-1
              gap-custom-16

              sm:grid-cols-2
            "
          >

            {/* =========================================== */}
            {/* COMPANY */}
            {/* =========================================== */}

            <div
              className="
                flex
                min-w-52
                flex-col
                gap-custom-8
              "
            >

              <label
                htmlFor="company"
                className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-wide
                  text-neutralPrimary
                "
              >
                Company
              </label>


              <select
                id="company"
                value={
                  filters.company
                }
                onChange={
                  (
                    event
                  ) =>
                    handleCompanyChange(
                      event.target.value
                    )
                }
                className="
                  h-custom-48
                  rounded-lg
                  border
                  border-neutralMed
                  bg-white
                  px-custom-16
                  text-sm
                  text-neutralPrimary
                  outline-none
                  cursor-pointer

                  focus:border-mainPrimary
                  focus:ring-1
                  focus:ring-mainPrimary
                "
              >

                {companies.map(
                  (
                    company
                  ) => (

                    <option
                      key={
                        company.value
                      }
                      value={
                        company.value
                      }
                    >
                      {
                        company.label
                      }
                    </option>

                  )
                )}

              </select>

            </div>


            {/* =========================================== */}
            {/* BRANCH */}
            {/* =========================================== */}

            <div
              className="
                flex
                min-w-52
                flex-col
                gap-custom-8
              "
            >

              <label
                htmlFor="branch"
                className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-wide
                  text-neutralPrimary
                "
              >
                Branch
              </label>


              <select
                id="branch"
                value={
                  filters.branch
                }
                onChange={
                  (
                    event
                  ) =>
                    handleBranchChange(
                      event.target.value
                    )
                }
                className="
                  h-custom-48
                  rounded-lg
                  border
                  border-neutralMed
                  bg-white
                  px-custom-16
                  text-sm
                  text-neutralPrimary
                  outline-none
                  cursor-pointer

                  focus:border-mainPrimary
                  focus:ring-1
                  focus:ring-mainPrimary
                "
              >

                {branches.map(
                  (
                    branch
                  ) => (

                    <option
                      key={
                        branch.value
                      }
                      value={
                        branch.value
                      }
                    >
                      {
                        branch.label
                      }
                    </option>

                  )
                )}

              </select>

            </div>

          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* BUSINESS OVERVIEW */}
      {/* ================================================= */}

      <section
        className="
          mt-custom-32
          flex
          flex-col
          gap-custom-16
        "
      >

        {/* =============================================== */}
        {/* SECTION TITLE */}
        {/* =============================================== */}

        <div>

          <h2
            className="
              text-sm
              font-bold
              uppercase
              tracking-wide
              text-mainPrimary
            "
          >
            Business Overview
          </h2>


          <p
            className="
              mt-1
              text-xs
              text-neutralPrimary
            "
          >
            Key performance indicators for the selected period.
          </p>

        </div>


        {/* =============================================== */}
        {/* LOADING */}
        {/* =============================================== */}

        {isDashboardLoading && (

          <div
            className="
              grid
              grid-cols-1
              gap-custom-16

              md:grid-cols-2
              xl:grid-cols-4
            "
          >

            {Array.from({
              length: 4,
            }).map(
              (
                _,
                index
              ) => (

                <div
                  key={
                    index
                  }
                  className="
                    h-48
                    animate-pulse
                    rounded-xl
                    border
                    border-neutralMed
                    bg-white
                  "
                />

              )
            )}

          </div>

        )}


        {/* =============================================== */}
        {/* ERROR */}
        {/* =============================================== */}

        {isDashboardError && (

          <div
            className="
              rounded-xl
              border
              border-negative
              bg-white
              p-custom-24
              text-sm
              text-negative
            "
          >
            Unable to load dashboard information.
          </div>

        )}


        {/* =============================================== */}
        {/* DASHBOARD DATA */}
        {/* =============================================== */}

        {dashboard && (

          <>

            <div
              className="
                grid
                grid-cols-1
                gap-custom-16

                md:grid-cols-2
                xl:grid-cols-4
              "
            >

              {/* ========================================= */}
              {/* TOTAL AGENTS */}
              {/* ========================================= */}

              <DashboardMetricCard
                title="Total Agents"

                value={
                  formatNumber(
                    dashboard
                      .totalAgents
                      .value
                  )
                }

                subtitle={
                  `${formatChange(
                    dashboard
                      .totalAgents
                      .percentageChange
                  )} vs previous period`
                }

                trend={
                  dashboard
                    .totalAgents
                    .trend
                }

                icon={
                  <Users
                    size={22}
                    className="
                      text-mainPrimary
                    "
                  />
                }
              />


              {/* ========================================= */}
              {/* ACTIVE AGENTS */}
              {/* ========================================= */}

              <DashboardMetricCard
                title="Active Agents"

                value={
                  formatNumber(
                    dashboard
                      .activeAgents
                      .value
                  )
                }

                subtitle={
                  `${dashboard
                    .activeAgents
                    .percentageOfTotal
                    .toFixed(1)}% of total agents`
                }

                icon={
                  <UserCheck
                    size={22}
                    className="
                      text-positive
                    "
                  />
                }

                accent="positive"
              />


              {/* ========================================= */}
              {/* LOANS DISBURSED */}
              {/* ========================================= */}

              <DashboardMetricCard
                title="Loans Disbursed"

                value={
                  formatNumber(
                    dashboard
                      .loansDisbursed
                      .value
                  )
                }

                subtitle={
                  `${formatChange(
                    dashboard
                      .loansDisbursed
                      .percentageChange
                  )} vs previous period`
                }

                trend={
                  dashboard
                    .loansDisbursed
                    .trend
                }

                icon={
                  <Landmark
                    size={22}
                    className="
                      text-mainPrimary
                    "
                  />
                }
              />


              {/* ========================================= */}
              {/* COMMISSION */}
              {/* ========================================= */}

              <DashboardMetricCard
                title="Total Commission"

                value={
                  formatPesoCompact(
                    dashboard
                      .commissionsPaid
                      .value
                  )
                }

                subtitle={
                  `${formatChange(
                    dashboard
                      .commissionsPaid
                      .percentageChange
                  )} vs previous period`
                }

                trend={
                  dashboard
                    .commissionsPaid
                    .trend
                }

                icon={
                  <CircleDollarSign
                    size={22}
                    className="
                      text-positive
                    "
                  />
                }

                accent="positive"
              />

            </div>


            {/* =========================================== */}
            {/* TOTAL LOAN VALUE */}
            {/* =========================================== */}

            <div
              className="
                flex
                flex-col
                gap-1
                rounded-xl
                border
                border-neutralMed
                bg-white
                px-custom-24
                py-custom-16
                shadow-sm

                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >

              <div>

                <p
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wide
                    text-neutralPrimary
                  "
                >
                  Total Loan Value
                </p>


                <p
                  className="
                    mt-1
                    text-xs
                    text-neutralPrimary
                  "
                >
                  Combined loan amount of processed clients for the selected period.
                </p>

              </div>


              <p
                className="
                  text-xl
                  font-bold
                  text-mainPrimary
                "
              >
                {formatPesoCompact(
                  dashboard
                    .loansDisbursed
                    .totalLoanAmount
                )}
              </p>

            </div>

          </>

        )}

      </section>

      <AgentManagement
        key={`${filters.period}-${filters.company ?? "ALL"}-${filters.branch ?? "ALL"}`}
        period={filters.period}
        company={filters.company}
        branch={filters.branch}
      />

       <div className="border border-neutralMed rounded-xl shadow-sm mt-custom-32">
          <div className="p-custom-16 border-b border-neutralMed">
            <h3 className="font-semibold text-mainPrimary">
              Agent Commission Report
            </h3>
          </div>
          
          <div className="flex justify-start items-end pt-custom-16 px-custom-16 gap-x-custom-16">

            
              <div className="flex flex-col gap-1 items-start">
                    <label htmlFor="startPeriod" className="text-sm px-custom-8 text-neutralPrimary">
                      Report Type
                    </label>

                    <select
                      id="reportType"
                      value={
                        reportType
                      }
                      onChange={
                        (event)=>
                          setReportType(event.target.value as ReportType)
                      }
                      className="
                        border
                      border-neutralMed
                        rounded-xl
                        px-custom-16
                        py-custom-8
                        text-sm
                        text-mainPrimary
                        bg-white
                      "
                    >
      
                      <option value="AGENT">
                        Agent Performance
                      </option>

                      <option value="BRANCH">
                        Branch Summary
                      </option>

                    
                    </select>
            </div>


              <div className="flex flex-col gap-1 items-start">
                <label
                    htmlFor="reportSearch"
                    className="text-sm px-custom-8 text-neutralPrimary"
                  >
                    {reportType === "AGENT"
                      ? "Agent Name"
                      : "Branch"}
                </label>

                <input
                    id="reportSearch"
                    type="search"
                    value={searchName}
                    onChange={(event) =>
                      setSearchName(event.target.value)
                    }
                    autoComplete="off"
                    className="
                      min-w-60
                      border
                      border-neutralMed
                      rounded-xl
                      px-custom-16
                      py-custom-8
                      text-sm
                      text-mainPrimary
                      bg-white
                      placeholder:text-neutralPrimary
                    "
                    placeholder={
                      reportType === "AGENT"
                        ? "Search agent name..."
                        : "Search branch..."
                    }
                  />
              </div>
            <div className="flex flex-col gap-1 items-start">
              <label htmlFor="startPeriod" className="text-sm px-custom-8 text-neutralPrimary">Start Period</label>
                <input
                  id="startPeriod"
                  type="date"
                  value={startPeriod}
                  onChange={(event) => {
                    setStartPeriod(event.target.value)
                  }}
                  className="
                    border
                    border-neutralMed
                    rounded-xl
                    px-custom-16
                    py-custom-8
                    text-sm
                    text-mainPrimary
                    bg-white
                  "
                />
            </div>

             <div className="flex flex-col gap-1 items-start">
              <label htmlFor="endPeriod" className="text-sm px-custom-8 text-neutralPrimary">End Period</label>
                <input
                  id="endPeriod"
                  type="date"
                  value={endPeriod}
                  onChange={(event) => {
                    setEndPeriod(event.target.value)
                  }}
                  className="
                    border
                    border-neutralMed
                    rounded-xl
                    px-custom-16
                    py-custom-8
                    text-sm
                    text-mainPrimary
                    bg-white
                  "
                />
            </div>

            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={
                !startPeriod ||
                !endPeriod ||
                startPeriod > endPeriod
              }
              className="
                bg-mainPrimary
                text-white
                px-custom-24
                py-custom-8
                rounded-lg
                font-normal
                cursor-pointer
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              Generate Report
            </button>
          </div>

          {reportType === "AGENT" ? (
            <AgentCommissionReport
              reportType={reportType}
              startPeriod={startPeriod}
              endPeriod={endPeriod}
              searchName={searchName}
            />
          ) : (
            <BranchCommissionReport
              reportType={reportType}
              startPeriod={startPeriod}
              endPeriod={endPeriod}
              searchName={searchName}
            />
          )}
      </div>  

      {/* ========================================= */}
      {/* TOP PERFORMING AGENTS */}
      {/* ========================================= */}

      {dashboard && (

        <div
          className="
            mt-custom-32
          "
        >

          <TopPerformingAgents
            agents={
              dashboard
                .topPerformingAgents
            }

            periodLabel={
              performancePeriodLabel
            }
          />

        </div>

      )}

      {/* ========================================= */}
      {/* AGENT DISTRIBUTION */}
      {/* ========================================= */}

      {dashboard && (
        <section
          className="
            mt-custom-32
            grid
            grid-cols-1
            gap-custom-24

            xl:grid-cols-2
          "
        >
          <AgentStatusChart
            data={
              dashboard
                .agentStatusDistribution
            }
          />

          <AgentLevelChart
            data={
              dashboard
                .agentLevelDistribution
            }
          />
        </section>
      )}


    

    </div>
  );
}