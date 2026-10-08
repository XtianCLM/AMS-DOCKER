
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AgentManagementLevel,
  AgentManagementStatus,
  DashboardPeriod,
  AgentManagementResponse,
} from "@repo/shared";

import { Printer } from "lucide-react";

import {
  useAgentManagement,
} from "@/hooks/bodDashboard/useBodDashboard";

import {
  getAgentManagementService,
} from "@/services/bodDashboard/bodDashboard.service";
// Adjust this import path to your existing service file.

interface AgentManagementProps {
  period: DashboardPeriod;
  company?: string;
  branch?: string;
}

type AgentRow =
  AgentManagementResponse["data"][number];

const PAGE_SIZE = 10;

// Fetch records in batches instead of relying on
// the backend accepting one unlimited page size.
const PRINT_BATCH_SIZE = 100;

// ================================================
// HELPERS
// ================================================

const formatMoney = (value: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getStatusClass = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-700";
    case "EXPIRED":
      return "bg-orange-100 text-orange-700";
    case "SUSPENDED":
      return "bg-red-100 text-red-700";
    case "DROPPED":
      return "bg-gray-200 text-gray-700";
    case "REMOVE":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-neutralLight text-neutralPrimary";
  }
};

const getPeriodLabel = (period: DashboardPeriod) => {
  switch (period) {
    case "DAILY":
      return "Daily";
    case "WEEKLY":
      return "Weekly";
    case "MONTHLY":
      return "Monthly";
    case "ANNUAL":
      return "Annual";
    default:
      return period;
  }
};

const getLevelLabel = (
  level: AgentManagementLevel
) => {
  switch (level) {
    case "L1":
      return "Level 1";
    case "L2":
      return "Level 2";
    case "L3":
      return "Level 3";
    default:
      return "All Levels";
  }
};

const getStatusLabel = (
  status: AgentManagementStatus
) => {
  return status === "ALL"
    ? "All Status"
    : status;
};

// ================================================
// REUSABLE TABLE
// ================================================

function AgentTable({
  agents,
  showActions = true,
}: {
  agents: AgentRow[];
  showActions?: boolean;
}) {
  return (
    <table className="w-full min-w-275 border-collapse agent-report-table">
      <thead className="bg-neutralLight">
        <tr>
          {[
            "Agent Code",
            "Name",
            "Level",
            "Upline",
            "Branch",
            "Status",
            "Sales",
            "Commission",
          ].map((heading) => (
            <th
              key={heading}
              className="px-custom-16 py-custom-16 text-left text-sm font-semibold text-mainPrimary"
            >
              {heading}
            </th>
          ))}

          {showActions && (
            <th className="px-custom-16 py-custom-16 text-left text-sm font-semibold text-mainPrimary">
              Actions
            </th>
          )}
        </tr>
      </thead>

      <tbody>
        {agents.length === 0 ? (
          <tr>
            <td
              colSpan={showActions ? 9 : 8}
              className="py-custom-32 text-center text-sm text-neutralPrimary"
            >
              No agents found.
            </td>
          </tr>
        ) : (
          agents.map((agent) => (
            <tr
              key={agent.id}
              className="border-b border-neutralMed hover:bg-neutralLight"
            >
              <td className="px-custom-16 py-custom-16 text-sm">
                {agent.agentCode}
              </td>

              <td className="px-custom-16 py-custom-16 text-sm font-semibold">
                {agent.name}
              </td>

              <td className="px-custom-16 py-custom-16 text-sm">
                {agent.level}
              </td>

              <td className="px-custom-16 py-custom-16 text-sm">
                {agent.upline?.name ?? "-"}
              </td>

              <td className="px-custom-16 py-custom-16 text-sm">
                {agent.branch?.branchName ?? "-"}
              </td>

              <td className="px-custom-16 py-custom-16">
                <span
                  className={`status-print inline-flex rounded-full px-custom-16 py-1 text-xs font-semibold ${getStatusClass(agent.status)}`}
                >
                  {agent.status}
                </span>
              </td>

              <td className="px-custom-16 py-custom-16 text-sm">
                {formatMoney(agent.sales)}
              </td>

              <td className="px-custom-16 py-custom-16 text-sm font-semibold">
                {formatMoney(agent.commission)}
              </td>

              {showActions && (
                <td className="px-custom-16 py-custom-16">
                  <button
                    type="button"
                    className="rounded-md bg-neutralPrimary px-custom-8 py-1 text-xs font-semibold text-white cursor-pointer hover:opacity-80"
                  >
                    View
                  </button>
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

// ================================================
// MAIN COMPONENT
// ================================================

export default function AgentManagement({
  period,
  company = "ALL",
  branch = "ALL",
}: AgentManagementProps) {
  const [page, setPage] = useState(1);

  const [selectedLevel, setSelectedLevel] =
    useState<AgentManagementLevel>("ALL");

  const [selectedStatus, setSelectedStatus] =
    useState<AgentManagementStatus>("ALL");

  const [appliedLevel, setAppliedLevel] =
    useState<AgentManagementLevel>("ALL");

  const [appliedStatus, setAppliedStatus] =
    useState<AgentManagementStatus>("ALL");

  const [isPreparingPrint, setIsPreparingPrint] =
    useState(false);

  const [printAgents, setPrintAgents] =
    useState<AgentRow[] | null>(null);

  const [printError, setPrintError] =
    useState<string | null>(null);

  const [printGeneratedDate, setPrintGeneratedDate] =
    useState("");

  const [printFilters, setPrintFilters] =
    useState({
      period,
      company,
      branch,
      level: appliedLevel,
      status: appliedStatus,
    });

  const printRequestRef = useRef(0);

  // ================================================
  // NORMAL PAGINATED QUERY
  // ================================================

  const {
    data,
    isLoading,
    isFetching,
    isError,
  } = useAgentManagement({
    page,
    pageSize: PAGE_SIZE,
    period,
    company,
    branch,
    level: appliedLevel,
    status: appliedStatus,
  });

  // ================================================
  // FILTERS
  // ================================================

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedLevel(selectedLevel);
    setAppliedStatus(selectedStatus);
  };

  // ================================================
  // FETCH ALL RECORDS FOR PRINT
  // ================================================

  const handlePrint = async () => {
    if (isPreparingPrint || !data) return;

    const requestId = ++printRequestRef.current;

    setIsPreparingPrint(true);
    setPrintError(null);
    setPrintAgents(null);

    const filters = {
      period,
      company,
      branch,
      level: appliedLevel,
      status: appliedStatus,
    };

    try {
      const firstResponse =
        await getAgentManagementService({
          ...filters,
          page: 1,
          pageSize: PRINT_BATCH_SIZE,
        });

      if (firstResponse.total > 0 &&
          firstResponse.data.length === 0) {
        throw new Error(
          "The API returned no records for the report."
        );
      }

      const allAgents: AgentRow[] = [
        ...firstResponse.data,
      ];

      // Calculate the remaining pages from the
      // actual number returned by the backend.
      // This also handles APIs that cap pageSize.
      const effectivePageSize =
        firstResponse.data.length ||
        PRINT_BATCH_SIZE;

      const totalPages = Math.ceil(
        firstResponse.total / effectivePageSize
      );

      for (
        let currentPage = 2;
        currentPage <= totalPages;
        currentPage++
      ) {
        const response =
          await getAgentManagementService({
            ...filters,
            page: currentPage,
            pageSize: PRINT_BATCH_SIZE,
          });

        if (response.data.length === 0) {
          throw new Error(
            `Missing report data on page ${currentPage}.`
          );
        }

        allAgents.push(...response.data);
      }

      // Protect against overlapping or incomplete data.
      const uniqueAgents = Array.from(
        new Map(
          allAgents.map((agent) => [
            agent.id,
            agent,
          ])
        ).values()
      );

      if (
        uniqueAgents.length !== firstResponse.total
      ) {
        throw new Error(
          `Incomplete report: loaded ${uniqueAgents.length} of ${firstResponse.total} agents.`
        );
      }

      if (requestId !== printRequestRef.current) {
        return;
      }

      setPrintFilters(filters);

      setPrintGeneratedDate(
        new Date().toLocaleString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      );

      setPrintAgents(uniqueAgents);
    } catch (error) {
      console.error(
        "Failed to prepare agent report:",
        error
      );

      setPrintError(
        error instanceof Error
          ? error.message
          : "Unable to prepare the report."
      );

      setIsPreparingPrint(false);
    }
  };

  // Print after the complete table has rendered.
  useEffect(() => {
    if (!isPreparingPrint || !printAgents) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [isPreparingPrint, printAgents]);

  // Restore the normal state when print closes.
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPreparingPrint(false);
      setPrintAgents(null);
    };

    window.addEventListener(
      "afterprint",
      handleAfterPrint
    );

    return () => {
      window.removeEventListener(
        "afterprint",
        handleAfterPrint
      );
    };
  }, []);

  // ================================================
  // PRINT TOTALS
  // ================================================

  const totals = useMemo(() => {
    const agents = printAgents ?? [];

    return agents.reduce(
      (result, agent) => ({
        sales: result.sales + agent.sales,
        commission:
          result.commission + agent.commission,
      }),
      {
        sales: 0,
        commission: 0,
      }
    );
  }, [printAgents]);

  const currentAgents = data?.data ?? [];

  // ================================================
  // RENDER
  // ================================================

  return (
    <section
      id="agent-management-print"
      className="mt-custom-32 overflow-hidden rounded-2xl border border-neutralMed bg-white shadow-sm"
    >
      {/* PRINT HEADER */}

      {printAgents && (
        <div className="print-only mb-6">
          <div className="text-center">
            <h1 className="text-xl font-bold">
              AGENT MANAGEMENT SYSTEM
            </h1>

            <h2 className="mt-2 text-base font-bold">
              AGENT MANAGEMENT REPORT
            </h2>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-2 text-xs">
            <div>
              <strong>Period:</strong>{" "}
              {getPeriodLabel(printFilters.period)}
            </div>

            <div>
              <strong>Company:</strong>{" "}
              {printFilters.company === "ALL"
                ? "All Companies"
                : printFilters.company}
            </div>

            <div>
              <strong>Branch:</strong>{" "}
              {printFilters.branch === "ALL"
                ? "All Branches"
                : printFilters.branch}
            </div>

            <div>
              <strong>Level:</strong>{" "}
              {getLevelLabel(printFilters.level)}
            </div>

            <div>
              <strong>Status:</strong>{" "}
              {getStatusLabel(printFilters.status)}
            </div>

            <div>
              <strong>Generated:</strong>{" "}
              {printGeneratedDate}
            </div>
          </div>

          <div className="mt-4 border-b border-black" />
        </div>
      )}

      {/* SCREEN HEADER */}

      <div className="no-print my-custom-16 mx-custom-24 flex flex-col gap-custom-16 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-mainPrimary">
            Agent Management
          </h2>

          <p className="mt-1 text-xs text-neutralPrimary">
            Lists of Agent per branch filtered by
            level and status.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          disabled={
            isLoading ||
            isFetching ||
            isPreparingPrint ||
            !data
          }
          className="flex items-center justify-center gap-custom-8 rounded-lg bg-mainPrimary px-custom-16 py-custom-8 text-sm font-semibold text-white cursor-pointer hover:bg-lightPrimary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer size={16} />

          {isPreparingPrint
            ? "Preparing Report..."
            : "Print Report"}
        </button>
      </div>

      {/* ERROR */}

      {printError && (
        <div className="no-print mx-custom-24 mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {printError}
        </div>
      )}

      {/* FILTERS */}

      <div className="no-print flex flex-wrap items-end gap-custom-16 border-b border-neutralMed bg-neutralLight p-custom-24">
        <div className="flex min-w-44 flex-col gap-custom-8">
          <label className="text-xs text-neutralPrimary">
            Level
          </label>

          <select
            value={selectedLevel}
            onChange={(event) =>
              setSelectedLevel(
                event.target.value as AgentManagementLevel
              )
            }
            className="rounded-lg border border-neutralMed bg-white px-custom-16 py-custom-8 text-sm"
          >
            <option value="ALL">All Levels</option>
            <option value="L1">Level 1</option>
            <option value="L2">Level 2</option>
            <option value="L3">Level 3</option>
          </select>
        </div>

        <div className="flex min-w-44 flex-col gap-custom-8">
          <label className="text-xs text-neutralPrimary">
            Status
          </label>

          <select
            value={selectedStatus}
            onChange={(event) =>
              setSelectedStatus(
                event.target.value as AgentManagementStatus
              )
            }
            className="rounded-lg border border-neutralMed bg-white px-custom-16 py-custom-8 text-sm"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DROPPED">Dropped</option>
            <option value="REMOVE">Removed</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleApplyFilters}
          disabled={isFetching}
          className="min-w-40 rounded-lg bg-mainPrimary px-custom-24 py-custom-8 text-sm font-semibold text-white cursor-pointer hover:bg-lightPrimary disabled:opacity-50"
        >
          {isFetching
            ? "Applying..."
            : "Apply Filters"}
        </button>
      </div>

      {/* SCREEN TABLE - ONLY 10 AGENTS */}

      <div className="no-print w-full overflow-x-auto">
        {isLoading ? (
          <div className="py-10 text-center text-sm">
            Loading agents...
          </div>
        ) : isError ? (
          <div className="py-10 text-center text-negative">
            Failed to load agents.
          </div>
        ) : (
          <AgentTable
            agents={currentAgents}
            showActions
          />
        )}
      </div>

      {/* PRINT TABLE - ALL MATCHING AGENTS */}

      {printAgents && (
        <div className="print-only print-table-wrapper">
          <AgentTable
            agents={printAgents}
            showActions={false}
          />
        </div>
      )}

      {/* PRINT TOTALS */}

      {printAgents && (
        <div className="print-only mt-5 border-t border-black pt-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <p>
              <strong>Records Printed:</strong>{" "}
              {printAgents.length}
            </p>

            <p>
              <strong>Total Matching Agents:</strong>{" "}
              {printAgents.length}
            </p>

            <p>
              <strong>Total Sales:</strong>{" "}
              {formatMoney(totals.sales)}
            </p>

            <p>
              <strong>Total Commission:</strong>{" "}
              {formatMoney(totals.commission)}
            </p>
          </div>
        </div>
      )}

      {/* PAGINATION */}

      <div className="no-print flex flex-col gap-custom-16 border-t border-neutralMed p-custom-24 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutralPrimary">
          Page {data?.page ?? page} of{" "}
          {data?.totalPages ?? 1}
          {" · "}
          {data?.total ?? 0} agents
        </p>

        <div className="flex flex-wrap items-center gap-custom-8">
          <button
            type="button"
            disabled={page <= 1 || isFetching}
            onClick={() =>
              setPage((previous) =>
                Math.max(previous - 1, 1)
              )
            }
            className="rounded-lg border border-neutralMed px-custom-16 py-custom-8 text-sm cursor-pointer disabled:opacity-50"
          >
            Previous
          </button>

          {Array.from({
            length: data?.totalPages ?? 0,
          }).map((_, index) => {
            const pageNumber = index + 1;

            return (
              <button
                key={pageNumber}
                type="button"
                disabled={isFetching}
                onClick={() => setPage(pageNumber)}
                className={`h-10 w-10 rounded-lg text-sm font-semibold cursor-pointer ${
                  page === pageNumber
                    ? "bg-mainPrimary text-white"
                    : "border border-neutralMed bg-white"
                }`}
              >
                {pageNumber}
              </button>
            );
          })}

          <button
            type="button"
            disabled={
              page >= (data?.totalPages ?? 1) ||
              isFetching
            }
            onClick={() =>
              setPage((previous) => previous + 1)
            }
            className="rounded-lg border border-neutralMed px-custom-16 py-custom-8 text-sm cursor-pointer disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* PRINT STYLES */}

      <style jsx global>{`
        .print-only {
          display: none;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          body {
            background: white !important;
          }

          .no-print,
          .screen-heading {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          #agent-management-print {
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }

          .print-table-wrapper {
            overflow: visible !important;
            width: 100% !important;
          }

          .agent-report-table {
            width: 100% !important;
            min-width: 0 !important;
            border-collapse: collapse !important;
            font-size: 9px !important;
          }

          .agent-report-table thead {
            display: table-header-group !important;
          }

          .agent-report-table tbody {
            display: table-row-group !important;
          }

          .agent-report-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .agent-report-table th,
          .agent-report-table td {
            padding: 5px 7px !important;
            border: 1px solid #d1d5db !important;
            font-size: 9px !important;
            overflow-wrap: anywhere;
          }

          .agent-report-table th {
            background: #f3f4f6 !important;
            color: black !important;
            font-weight: 700 !important;
          }

          .status-print {
            padding: 2px 5px !important;
            border-radius: 4px !important;
          }
        }
      `}</style>
    </section>
  );
}
