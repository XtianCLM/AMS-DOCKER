import { Suspense } from "react";
import CommissionReportClient from "./CommissionReportClient";

export default function CommissionReportPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center">
          Preparing report...
        </div>
      }
    >
      <CommissionReportClient />
    </Suspense>
  );
}