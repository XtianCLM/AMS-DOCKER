import { Suspense } from "react";
import CommissionDetailsClient from "./CommissionDetailsClient";

export default function CommissionDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center">
          Preparing report...
        </div>
      }
    >
      <CommissionDetailsClient />
    </Suspense>
  );
}