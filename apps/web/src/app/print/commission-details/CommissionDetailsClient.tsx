"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  AgentCommissionDetailsResponse,
  CommissionDetailType,
} from "@repo/shared";

import { getAgentCommissionDetailsPrint } from "@/services/reports/reports.service";
import { formatMoney } from "@/app/(AMS)/Reports/helper/moneyFormat.helper";

export default function CommissionDetailsClient() {
  const searchParams = useSearchParams();

  const agentId =
    searchParams.get("agentId") ?? "";

  const detailType =
    searchParams.get(
      "detailType"
    ) as CommissionDetailType | null;

  const startPeriod =
    searchParams.get("startPeriod") ?? "";

  const endPeriod =
    searchParams.get("endPeriod") ?? "";

  const [report, setReport] =
    useState<AgentCommissionDetailsResponse | null>(
      null
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isError, setIsError] =
    useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      if (
        !agentId ||
        !detailType ||
        !startPeriod ||
        !endPeriod
      ) {
        setIsError(true);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setIsError(false);

        const result =
          await getAgentCommissionDetailsPrint({
            agentId,
            detailType,
            startPeriod,
            endPeriod,
          });

        setReport(result);
      } catch (error) {
        console.error(
          "Failed to load commission detail report:",
          error
        );

        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [
    agentId,
    detailType,
    startPeriod,
    endPeriod,
  ]);

  if (isLoading) {
    return (
      <div className="p-10 text-center">
        Preparing report...
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="p-10 text-center text-red-600">
        Unable to generate commission detail report.
      </div>
    );
  }

  const isDirect =
    report.detailType === "DIRECT";

  const title =
    report.detailType === "DIRECT"
      ? "Direct Commission Details"
      : report.detailType === "OVERRIDE_L2"
      ? "Downline Commission Details - L2"
      : "Downline Commission Details - L3";

  return (
    <main className="min-h-screen bg-white text-darkPrimary">
      <div className="report-print-actions sticky top-0 z-50 flex justify-end gap-3 bg-white px-6 py-4">
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg border text-neutralPrimary border-gray-300 px-5 py-2 cursor-pointer"
        >
          Close
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-neutralPrimary text-white px-5 py-2 cursor-pointer"
        >
          Print
        </button>
      </div>

      <div className="p-8">
        <header className="text-center border-t pt-4 py-custom-16">
          <div className="flex flex-col gap-y-custom-16 py-custom-8">
            <h1 className="text-xl font-bold">
              AGENT MANAGEMENT SYSTEM
            </h1>

            <h2 className="text-lg font-semibold">
              {title}
            </h2>
          </div>

          <div className="w-full flex justify-between items-end mt-custom-24">
            <div className="flex flex-col gap-custom-8 items-start">
              <p className="text-sm">
                Agent:{" "}
                <strong>
                  {report.fullName}
                </strong>
              </p>

              <p className="text-sm">
                Reporting Period:{" "}
                <strong>
                  {startPeriod} to {endPeriod}
                </strong>
              </p>
            </div>

            <div>
              <p className="text-sm">
                Total Commission:{" "}
                <strong>
                  {formatMoney(
                    report.totalCommission
                  )}
                </strong>
              </p>
            </div>
          </div>
        </header>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-darkPrimary p-2 text-left">
                Date
              </th>

              <th className="border border-darkPrimary p-2 text-left">
                {isDirect
                  ? "Client"
                  : "Received From"}
              </th>

              <th className="border border-darkPrimary p-2 text-left">
                Reference
              </th>

              {!isDirect && (
                <th className="border border-darkPrimary p-2 text-left">
                  Source Level
                </th>
              )}

              {isDirect && (
                <th className="border border-darkPrimary p-2 text-left">
                  Loan Term
                </th>
              )}

              {isDirect && (
                <>
                  <th className="border border-darkPrimary p-2 text-right">
                    Sale Amount
                  </th>

                  <th className="border border-darkPrimary p-2 text-right">
                    Percentage
                  </th>
                </>
              )}

              <th className="border border-darkPrimary p-2 text-right">
                Commission
              </th>
            </tr>
          </thead>

          <tbody>
            {report.transactions.map(
              (transaction) => (
                <tr
                  key={
                    transaction.transactionId
                  }
                >
                  <td className="border border-darkPrimary p-2">
                    {transaction.scannedAt
                      ? new Date(
                          transaction.scannedAt
                        ).toLocaleDateString(
                          "en-PH"
                        )
                      : "-"}
                  </td>

                  <td className="border border-darkPrimary p-2">
                    {isDirect
                      ? transaction.clientName ?? "-"
                      : transaction.sourceAgentName ?? "-"}
                  </td>

                  <td className="border border-darkPrimary p-2">
                    {transaction.saleReference ??
                      "-"}
                  </td>

                  {!isDirect && (
                    <td className="border border-darkPrimary p-2">
                      {transaction.sourceLevel ??
                        "-"}
                    </td>
                  )}

                  {isDirect && (
                    <td className="border border-darkPrimary p-2">
                      {transaction.term ??
                        "-"}
                    </td>
                  )}

                  {isDirect && (
                    <>
                      <td className="border border-darkPrimary p-2 text-right">
                        {formatMoney(
                          transaction.saleAmount
                        )}
                      </td>

                      <td className="border border-darkPrimary p-2 text-right">
                        {transaction.percentage ==
                        null
                          ? "-"
                          : `${transaction.percentage}%`}
                      </td>
                    </>
                  )}

                  <td className="border border-darkPrimary p-2 text-right font-semibold">
                    {formatMoney(
                      transaction.commissionAmount
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        <footer className="mt-8 border-t pt-3 text-xs">
          Generated:{" "}
          {new Date().toLocaleString(
            "en-PH"
          )}
        </footer>
      </div>
    </main>
  );
}