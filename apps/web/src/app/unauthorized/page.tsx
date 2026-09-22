"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShieldX, ArrowLeft, LogOut } from "lucide-react";

import { useAuth } from "@/components/context/UserContext";
import SweetAlert from "@/components/modal/Swal";
import { getErrorMessage } from "@/components/helper/errorHelper";

export default function UnauthorizedPage() {
  const router = useRouter();

  const {
    user,
    logout,
  } = useAuth();

  const handleLogout = () => {
    SweetAlert.confirmationAlert(
      "Sign Out",
      "Are you sure you want to sign out?",
      async () => {
        try {
          await logout();
        } catch (error) {
          SweetAlert.errorAlert(
            "Account Signing Out Failed",
            getErrorMessage(error)
          );
        }
      }
    );
  };

  return (
    <div
      className="
        min-h-screen
        bg-linear-to-b
        from-mainPrimary
        to-lightPrimary
        flex
        flex-col
      "
    >
      {/* HEADER */}
      <header
        className="
          h-custom-64
          shrink-0
          flex
          items-center
          justify-between
          px-custom-24
          bg-mainPrimary
          shadow-md
        "
      >
        <Image
          src="/images/AMSLOGO.svg"
          alt="JameroGroupOfCompanies"
          width={160}
          height={160}
          priority
        />

        {user && (
          <div
            className="
              text-white
              text-sm
              hidden
              sm:block
            "
          >
            {user.username}
          </div>
        )}
      </header>

      {/* CONTENT */}
      <main
        className="
          flex-1
          flex
          items-center
          justify-center
          p-custom-24
        "
      >
        <div
          className="
            w-full
            max-w-lg
            bg-white
            rounded-2xl
            shadow-2xl
            px-custom-32
            py-custom-48
            flex
            flex-col
            items-center
            text-center
            gap-custom-24
          "
        >
          {/* ICON */}
          <div
            className="
              w-20
              h-20
              rounded-full
              bg-negative/10
              flex
              items-center
              justify-center
              text-negative
            "
          >
            <ShieldX size={42} />
          </div>

          {/* TEXT */}
          <div className="flex flex-col gap-custom-8">
            <p
              className="
                text-xs
                font-bold
                uppercase
                tracking-widest
                text-negative
              "
            >
              Access Denied
            </p>

            <h1
              className="
                text-mdHeader
                font-bold
                text-mainPrimary
              "
            >
              You don&apos;t have permission
            </h1>

            <p
              className="
                text-sm
                text-neutralPrimary
                leading-relaxed
              "
            >
              Your account does not have permission to
              access this page. Contact your administrator
              if you believe you should have access.
            </p>
          </div>

          {/* USER */}
          {user && (
            <div
              className="
                w-full
                bg-neutralLight
                rounded-xl
                p-custom-16
                text-left
              "
            >
              <p
                className="
                  text-xs
                  text-neutralPrimary
                "
              >
                Signed in as
              </p>

              <p
                className="
                  font-bold
                  text-mainPrimary
                  text-sm
                "
              >
                {user.username}
              </p>
            </div>
          )}

          {/* ACTIONS */}
          <div
            className="
              flex
              flex-col
              sm:flex-row
              gap-custom-8
              w-full
            "
          >
            <button
              type="button"
              onClick={() => router.back()}
              className="
                w-full
                flex
                items-center
                justify-center
                gap-custom-8
                bg-mainPrimary
                text-white
                px-custom-16
                py-custom-8
                rounded-lg
                font-bold
                text-sm
                cursor-pointer
                hover:bg-lightPrimary
                transition
                duration-150
              "
            >
              <ArrowLeft size={16} />

              Go Back
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="
                w-full
                flex
                items-center
                justify-center
                gap-custom-8
                bg-neutralPrimary
                text-white
                px-custom-16
                py-custom-8
                rounded-lg
                font-bold
                text-sm
                cursor-pointer
                hover:opacity-90
                transition
                duration-150
              "
            >
              <LogOut size={16} />

              Sign Out
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer
        className="
          text-center
          text-white/60
          text-xs
          py-custom-16
        "
      >
        Agent Management System
      </footer>
    </div>
  );
}