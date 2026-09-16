"use client";

import {
  ChevronDown,
  Cpu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  useImportClientsDbf,
} from "@/hooks/clients/useClients";

import SweetAlert from "@/components/modal/Swal";

import axios from "axios";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MENU_SECTIONS } from "./menu.config";
import { useRef, useState, useEffect } from "react";
import { MenuItem, MenuSection, ReactivationApprovalSocketBranchPayload } from "@repo/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useMyReactivationApprovals } from "@/hooks/reactivation/useReactivation";
import { socket } from "@/lib/socket";
import { useAuth } from "../context/UserContext";

const menuItemClass =
  "flex items-center text-sm gap-x-2 py-2 rounded-md w-full transition-colors cursor-pointer";

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export default function Sidebar({
  isOpen,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showArrow, setShowArrow] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newTransactionCount, setNewTransactionCount] = useState(0);
  const [branchReactivationResultCount,setBranchReactivationResultCount] = useState(0);
  const [newPromotionCount,setNewPromotionCount] = useState(0);


  // dbf Upload 
  const dbfInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const {
    mutate: importDbf,
    isPending: isImportingDbf,
  } = useImportClientsDbf();

  const handleDbfFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(".dbf")
    ) {
      SweetAlert.errorAlert(
        "Invalid File",
        "Please select a DBF file."
      );

      event.target.value = "";

      return;
    }

    SweetAlert.confirmationAlert(
      "Initialize SSP",
      `Import client data from ${file.name}?`,
      () => {
        importDbf(file, {
          onSuccess: (
            result
          ) => {
            SweetAlert.successAlertFunction(
              "SSP Initialized",
              `${result.insertedRecords} client records were imported successfully.`,
              () => {
                router.push(
                  "/?initialize=true"
                );
              },
              () => {
                router.push(
                  "/?initialize=true"
                );
              }
            );
          },

          onError: (
            error
          ) => {
            console.error(
              "DBF import error:",
              error
            );

            const message =
              axios.isAxiosError(
                error
              )
                ? error.response
                    ?.data
                    ?.message
                : null;

            SweetAlert.errorAlert(
              "Initialization Failed",
              message ??
                "Failed to import SSP client data."
            );
          },
        });
      }
    );

    // Allows selecting the same DBF again.
    event.target.value = "";
  };
      

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: approvalRequests } =
    useMyReactivationApprovals({});

  const isAdmin =
    user?.roles?.some((role) =>
      ["ADMIN", "OPERATIONS"].includes(role)
    ) ?? false;

  const isBranchAccount =
    user?.roles?.includes("BRANCH_ACC") ?? false;

  const pendingApprovalCount =
    approvalRequests?.data?.filter(
      (item) => item.status === "PENDING"
    ).length ?? 0;

  const hasPermission = (permission?: string) => {
    if (!permission) return true;

    return (
      user?.permissions?.includes(permission) ?? false
    );
  };

  const getVisibleChildren = (children?: MenuItem[]) => {
    return children?.filter((child) =>
      hasPermission(child.permission)
    );
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      const isScrollable = el.scrollHeight > el.clientHeight;
      const isAtBottom =
        el.scrollTop + el.clientHeight >=
        el.scrollHeight - 5;

      setShowArrow(isScrollable && !isAtBottom);
    };

    checkScroll();

    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

    useEffect(() => {
    if (!user) return;

    const branchCode =
      user.branch?.branchCode;

    if (user.agent?.id) {
      socket.emit(
        "join-agent-room",
        user.agent.id
      );

      socket.emit(
        "join-upline-reactivation-room",
        user.agent.id
      );
    }

    if (isAdmin) {
      socket.emit(
        "join-admin-reactivation-room"
      );

      socket.emit(
        "join-admin-payment-room"
      );

      socket.emit(
        "join-admin-withdraw-room"
      );
      socket.emit(
        "join-admin-promotion-room"
      );
    }

    if (
      isBranchAccount &&
      branchCode
    ) {
      socket.emit(
        "join-branch-reactivation-room",
        branchCode
      );
    }

    const handleNewReactivationApproval = () => {
      queryClient.invalidateQueries({
        queryKey: [
          "my-reactivation-approvals",
        ],
      });
    };

    const handleBranchReactivationUpdated = (
      payload: ReactivationApprovalSocketBranchPayload
    ) => {
      if (
        payload.status !== "APPROVED" &&
        payload.status !== "REJECTED"
      ) {
        return;
      }

      setBranchReactivationResultCount(
        (previous) => previous + 1
      );

      queryClient.invalidateQueries({
        queryKey: [
          "my-reactivation-approvals",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "reactivation-request-details",
        ],
      });
    };

    const handleAdminPaymentUpdated = () => {
      setNewTransactionCount(
        (previous) => previous + 1
      );

      queryClient.invalidateQueries({
        queryKey: [
          "admin-reactivation-payments",
        ],
      });
    };

    const handleAdminWithdrawUpdated = () => {
      setNewTransactionCount(
        (previous) => previous + 1
      );

      queryClient.invalidateQueries({
        queryKey: [
          "admin-withdrawals",
        ],
      });
    };

    const handleAdminPromotionCreated = () => {
      setNewPromotionCount(
        (previous) =>
          previous + 1
      );

      queryClient.invalidateQueries({
        queryKey: [
          "agent-promotion-recommendations",
        ],
      });
    };

    socket.on(
      "new-reactivation-approval",
      handleNewReactivationApproval
    );

    socket.on(
      "branch-reactivation-updated",
      handleBranchReactivationUpdated
    );

    socket.on(
      "admin-payment-updated",
      handleAdminPaymentUpdated
    );

    socket.on(
      "admin-withdraw-updated",
      handleAdminWithdrawUpdated
    );

    socket.on(
      "admin-promotion-created",
      handleAdminPromotionCreated
    );

    return () => {
      socket.off(
        "new-reactivation-approval",
        handleNewReactivationApproval
      );

      socket.off(
        "branch-reactivation-updated",
        handleBranchReactivationUpdated
      );

      socket.off(
        "admin-payment-updated",
        handleAdminPaymentUpdated
      );

      socket.off(
        "admin-withdraw-updated",
        handleAdminWithdrawUpdated
      );

      socket.off(
        "admin-promotion-created",
        handleAdminPromotionCreated
      );
    };
  }, [
    user,
    isAdmin,
    isBranchAccount,
    queryClient,
  ]);
  
  const reactivationBadgeCount =
    isBranchAccount
      ? branchReactivationResultCount
      : pendingApprovalCount;

  const handleMenuClick = (
      path?: string
    ) => {
      if (!path) return;

      if (path.startsWith("/Reactivation")) {
        setBranchReactivationResultCount(0);
      }

      if (path.startsWith("/Transaction")) {
        setNewTransactionCount(0);
      }

      if (
        path.startsWith("/Promotion")
      ) {
        setNewPromotionCount(0);
      }
    };
  return (
    <div
      className={`
        relative
        h-full
        bg-neutralLight
        flex flex-col
        transition-all duration-300
        ${isOpen ? "p-4" : "py-4 px-2"}
      `}
    >
      <button
        onClick={onToggle}
        className="
          absolute
          top-0
          -right-10
          z-50
          flex
          items-center
          justify-center
          rounded-br-md
          w-10
          h-10
          bg-neutralLight
          border
          border-neutralLight
          cursor-pointer
          hover:bg-neutral-100
          transition-all
          duration-200
          text-neutralPrimary
        "
      >
        {isOpen ? (
          <ChevronLeft className="w-custom-24 h-custom-24" />
        ) : (
          <ChevronRight className="w-custom-24 h-custom-24" />
        )}
      </button>

      <div className="flex items-center justify-between border-b border-neutralPrimary pb-3.5 mb-6">

        {/* Hidden DBF input */}
        <input
          ref={dbfInputRef}
          type="file"
          accept=".dbf"
          onChange={
            handleDbfFileChange
          }
          className="hidden"
        />

        <button
          type="button"
          disabled={
            isImportingDbf
          }
          onClick={() => {
            dbfInputRef.current?.click();
          }}
          className={`
            inline-flex
            items-center
            ${isOpen
              ? "justify-between"
              : "justify-center"
            }
            w-full
            bg-positive
            hover:bg-positive-hover
            py-2
            rounded-lg
            text-white
            px-4
            transition-all
            duration-300
            disabled:opacity-50
            disabled:cursor-not-allowed
          `}
        >
          {isImportingDbf ? (
            isOpen ? (
              <>
                Initializing...

                <div
                  className="
                    w-5
                    h-5
                    border-2
                    border-white
                    border-t-transparent
                    rounded-full
                    animate-spin
                  "
                />
              </>
            ) : (
              <div
                className="
                  w-5
                  h-5
                  border-2
                  border-white
                  border-t-transparent
                  rounded-full
                  animate-spin
                "
              />
            )
          ) : isOpen ? (
            <>
              Initialize SSP

              <Cpu />
            </>
          ) : (
            <Cpu />
          )}
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 flex flex-col gap-y-4 w-full overflow-y-auto"
      >
        {MENU_SECTIONS.map((section: MenuSection) => {
          const visibleItems = section.items.filter(
            (item) => {
              const visibleChildren =
                getVisibleChildren(item.children);

              if (
                item.children &&
                item.children.length > 0
              ) {
                return (
                  visibleChildren &&
                  visibleChildren.length > 0
                );
              }

              return hasPermission(item.permission);
            }
          );

          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <div key={section.title} className="w-full">
              {isOpen && (
                <h6 className="text-sm text-mainNeutral mb-2">
                  {section.title}
                </h6>
              )}

              <ul className="flex flex-col gap-y-3 w-full font-semibold">
                {visibleItems.map((item: MenuItem) => {
                  const {
                    label,
                    icon: Icon,
                    path,
                  } = item;

                  const children =
                    getVisibleChildren(item.children);

                  const isExpandable =
                    children && children.length > 0;

                  const isActive = Boolean(
                    path &&
                      (pathname === path ||
                        pathname.startsWith(path + "/"))
                  );

                  if (isExpandable && children) {
                    const isChildActive = children.some(
                      (child) =>
                        pathname === child.path ||
                        pathname.startsWith(
                          child.path + "/"
                        )
                    );

                    return (
                      <li key={label}>
                        <button
                          onClick={() =>
                            setExpanded((prev) => ({
                              ...prev,
                              [label]: !prev[label],
                            }))
                          }
                          className={`
                            ${menuItemClass}
                            ${
                              isOpen
                                ? "justify-between px-4"
                                : "justify-center"
                            }
                            ${
                              isChildActive
                                ? "bg-mainPrimary text-white"
                                : "bg-neutralMed text-neutralPrimary hover:bg-mainPrimary hover:text-white"
                            }
                          `}
                        >
                          <div className="flex items-center gap-2">
                            {isOpen && <span>{label}</span>}

                            {!isOpen && (
                              <Icon className="w-5" />
                            )}
                          </div>

                          {isOpen && (
                            <ChevronDown
                              className={`transition-transform ${
                                expanded[label]
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />
                          )}
                        </button>

                        {expanded[label] && isOpen && (
                          <ul className="mt-2 flex flex-col gap-2 bg-white p-3 rounded-md shadow">
                            {children.map((child) => {
                              const ChildIcon = child.icon;

                              const isChildActive = Boolean(
                                child.path &&
                                  (pathname === child.path ||
                                    pathname.startsWith(
                                      child.path + "/"
                                    ))
                              );

                              return (
                                <li key={child.label}>
                                  <Link
                                    href={child.path!}
                                    className={`
                                      flex items-center justify-between px-3 py-2 rounded-md text-sm
                                      ${
                                        isChildActive
                                          ? "text-mainPrimary font-bold"
                                          : "text-neutralPrimary hover:text-mainPrimary"
                                      }
                                    `}
                                  >
                                    <span>{child.label}</span>
                                    <ChildIcon className="w-4" />
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  }

                  return (
                    <li key={label}>
                      <Link
                        href={path!}
                        onClick={() =>
                          handleMenuClick(path)
                        }
                        className={`
                          ${menuItemClass}
                          ${
                            isOpen
                              ? "justify-between px-4"
                              : "justify-center"
                          }
                          ${
                            isActive
                              ? "bg-mainPrimary text-white"
                              : "bg-neutralMed text-neutralPrimary hover:bg-mainPrimary hover:text-white"
                          }
                        `}
                      >
                        <div
                          className={`
                            relative
                            flex
                            items-center
                            w-full
                            gap-2
                            ${
                              isOpen
                                ? "justify-between"
                                : "justify-center"
                            }
                          `}
                        >
                          {isOpen && <span>{label}</span>}

                          <div className="relative">
                            <Icon
                              className={`
                                w-5
                                ${isActive ? "text-white" : ""}
                              `}
                            />

                          {label === "Reactivation Request" &&
                            reactivationBadgeCount > 0 && (
                              <span
                                className="
                                  absolute
                                  -top-3
                                  -right-4
                                  min-w-5
                                  h-5
                                  px-1
                                  flex
                                  items-center
                                  justify-center
                                  rounded-full
                                  bg-negative
                                  text-white
                                  text-[10px]
                                  font-bold
                                  leading-none
                                "
                              >
                                {reactivationBadgeCount > 99
                                  ? "99+"
                                  : reactivationBadgeCount}
                              </span>
                            )}

                            {label === "E-wallet Transaction" &&
                              newTransactionCount > 0 && (
                                <span
                                  className="
                                    absolute
                                    -top-3
                                    -right-4
                                    min-w-5
                                    h-5
                                    px-1
                                    flex
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-negative
                                    text-white
                                    text-[10px]
                                    font-bold
                                    leading-none
                                  "
                                >
                                  {newTransactionCount > 99
                                    ? "99+"
                                    : newTransactionCount}
                                </span>
                              )}

                              {label === "Agent Promotions" &&
                                newPromotionCount > 0 && (
                                  <span
                                    className="
                                      absolute
                                      -top-3
                                      -right-4
                                      min-w-5
                                      h-5
                                      px-1
                                      flex
                                      items-center
                                      justify-center
                                      rounded-full
                                      bg-negative
                                      text-white
                                      text-[10px]
                                      font-bold
                                      leading-none
                                    "
                                  >
                                    {newPromotionCount > 99
                                      ? "99+"
                                      : newPromotionCount}
                                  </span>
                              )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {showArrow && (
        <div className="absolute bottom-0 left-0 w-full flex justify-center opacity-30">
          <ChevronDown className="animate-bounce w-5" />
        </div>
      )}
    </div>
  );
}