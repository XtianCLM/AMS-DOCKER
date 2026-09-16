"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  CommissionPrintResponse,
  ReportType,
} from "@repo/shared";

import { getCommissionPrintReport } from "@/services/reports/reports.service";
import AgentReportTable from "./tables/agentReportTable";
import BranchReportTable from "./tables/branchReportTable";

export default function CommissionReportClient() {
  const searchParams = useSearchParams();

  const reportType =
    (searchParams.get("reportType") ??
      "AGENT") as ReportType;

  const startPeriod =
    searchParams.get("startPeriod") ?? "";

  const endPeriod =
    searchParams.get("endPeriod") ?? "";

  const searchName =
    searchParams.get("searchName") ?? "";

  const [report, setReport] =
    useState<CommissionPrintResponse | null>(
      null
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isError, setIsError] =
    useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        setIsError(false);

        const result =
          await getCommissionPrintReport({
            reportType,
            startPeriod,
            endPeriod,
            searchName:
              searchName || undefined,
          });

        setReport(result);
      } catch (error) {
        console.error(
          "Unable to load print report:",
          error
        );

        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (
      startPeriod &&
      endPeriod
    ) {
      fetchReport();
    } else {
      setIsLoading(false);
      setIsError(true);
    }
  }, [
    reportType,
    startPeriod,
    endPeriod,
    searchName,
  ]);

  if (isLoading) {
    return (
      <div className="p-10 text-center">
        Preparing report...
      </div>
    );
  }

  if (
    isError ||
    !report
  ) {
    return (
      <div className="p-10 text-center">
        Unable to generate report.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white p-8 text-neutralPrimary">
      <div className="report-print-actions mb-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            window.close()
          }
          className="
            rounded-lg
            border
            border-gray-300
            text-neutralPrimary
            cursor-pointer
            px-5
            py-2
          "
        >
          Close
        </button>

        <button
          type="button"
          onClick={() =>
            window.print()
          }
          className="
            rounded-lg
            bg-neutralPrimary
            cursor-pointer
            px-5
            py-2
            text-white
          "
        >
          Print
        </button>
      </div>

      <header className="text-center text-darkPrimary border-t pt-4 py-custom-16">
        <div className="flex flex-col gap-y-custom-16 py-custom-8">
          <h1 className="text-2xl font-bold">
            AGENT MANAGEMENT SYSTEM
          </h1>

          <h2 className="text-lg font-semibold">
            {report.reportType ===
            "AGENT"
              ? "Agent Commission Report"
              : "Branch Commission Report"}
          </h2>
        </div>

        <div className="flex mt-custom-24">
          <p className="text-sm">
            Reporting Period:{" "}
            <strong>
              {startPeriod} to{" "}
              {endPeriod}
            </strong>
          </p>
        </div>
      </header>

      {report.reportType ===
      "AGENT" ? (
        <AgentReportTable
          rows={report.data}
        />
      ) : (
        <BranchReportTable
          rows={report.data}
        />
      )}

      <footer className="mt-10 border-t pt-4 text-xs">
        Generated:{" "}
        {new Date().toLocaleString(
          "en-PH"
        )}
      </footer>
    </main>
  );
}