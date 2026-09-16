// components/TopEarningAgentsTable.tsx

import {
  ChevronLeft,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { ReportsTopAgent } from "@repo/shared";

type Props = {
  data?: ReportsTopAgent[];
  isLoading: boolean;
  page: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
};

const formatMoney = (value?: number | string | null) => {
  return `₱${Number(value ?? 0).toLocaleString()}`;
};

export default function TopEarningAgentsTable({
  data = [],
  isLoading,
  page,
  totalPages = 1,
  onPageChange,
}: Props) {
  return (
    <div className="">
      <div className="bg-white rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-white text-tertiaryHeader ">
            <tr className="text-darkPrimary">
              <th className="text-left px-custom-24 py-5 font-semibold">
                Agent
              </th>
              <th className="text-left px-custom-24 py-5 font-semibold">
                Transactions
              </th>
              <th className="text-left px-custom-24 py-5 font-semibold">
                Commission
              </th>
              <th className="text-left px-custom-24 py-5 font-semibold">
                Level
              </th>
            </tr>
          </thead>

          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} className="text-center py-10">
                  Loading...
                </td>
              </tr>
            )}

            {!isLoading && data.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="text-center py-16 text-neutralPrimary"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-neutralLight flex items-center justify-center">
                      <Wallet className="w-8 h-8 text-neutralPrimary" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold text-body">
                        No Top Earning Agents
                      </h3>
                      <p className="text-sm text-neutralPrimary">
                        No available agents.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading &&
              data.map((topagent) => (
                <tr
                  key={topagent.agent?.id}
                  className="text-neutralPrimary text-body odd:bg-neutralLight"
                >
                  <td className="text-left px-6 py-4 font-semibold ">
                    {topagent.agent?.fullName ?? "Unknown Agent"}
                  </td>
                  <td className="text-center py-4 font-semibold ">
                    {topagent.totalTransactions ?? "Unknown Agent"}
                  </td>

                  <td className="text-left px-6 py-4">
                    <strong className="text-mainPrimary">
                      {formatMoney(topagent.totalCommission)}
                    </strong>
                  </td>

                  <td className="text-left px-6 py-4">
                    <div className="inline-flex items-center px-custom-16 py-custom-8 rounded-xl bg-mainPrimary text-white text-xs font-semibold">
                      {topagent.agent?.level ?? "-"}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-custom-32 py-4 border-t border-neutralMed bg-white">
          <div className="text-sm text-neutralPrimary">
            Showing page{" "}
            <span className="font-semibold">{page}</span> of{" "}
            <span className="font-semibold">{totalPages}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutralMed hover:bg-neutralLight disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="px-custom-16 py-1 rounded-lg bg-mainPrimary text-white flex items-center justify-center font-semibold">
              {page}
            </div>

            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutralMed hover:bg-neutralLight disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}