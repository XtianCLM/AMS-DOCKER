import { Suspense } from "react";
import AMSLayoutClient from "./AMSLayoutClient";


export default function AMSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AMSLayoutLoading />}>
      <AMSLayoutClient>
        {children}
      </AMSLayoutClient>
    </Suspense>
  );
}

function AMSLayoutLoading() {
  return (
    <div
      className="
        min-h-screen
        w-full
        flex
        items-center
        justify-center
        bg-white
      "
    >
      <div className="flex items-center gap-3 text-mainPrimary">
        <div
          className="
            h-5
            w-5
            animate-spin
            rounded-full
            border-2
            border-mainPrimary
            border-t-transparent
          "
        />

        <span>
          Loading...
        </span>
      </div>
    </div>
  );
}