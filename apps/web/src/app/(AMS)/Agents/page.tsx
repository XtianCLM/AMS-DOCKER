"use client";

import {
  useDroppedorSuspendedAgentStatus,
  useMasterlistAgents,
} from "@/hooks/agents/useAgent";

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useSearchParams,
  useRouter,
} from "next/navigation";

import {
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Inspect,
  Trash,
  UserCheck,
  UserMinus,
  UserX,
} from "lucide-react";

import ModuleHeader from "@/components/ui/commonUi/page.header";
import QRCode from "react-qr-code";
import SweetAlert from "@/components/modal/Swal";
import Swal from "sweetalert2";
import AppsTab from "@/components/ui/commonUi/general.tab";
import { useDebounce } from "@/components/helper/useDebounse";
import EditAgentModal from "./components/EditAgentModal";

type TABKEY =
  | "ACTIVE"
  | "PROBATION"
  | "EXPIRED"
  | "DROPPED"
  | "SUSPENDED";

function MasterlistContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab =
    (searchParams.get("tab") as TABKEY) ?? "ACTIVE";

  const page =
    Number(searchParams.get("page") ?? 1);

  const searchParam =
    searchParams.get("search") ?? "";

  const [search, setSearch] =
    useState(searchParam);

  const [
    isEditModalOpen,
    setIsEditModalOpen,
  ] = useState(false);

  const [
    selectedAgentId,
    setSelectedAgentId,
  ] = useState<string | null>(null);

  const [
    openDropdown,
    setOpenDropdown,
  ] = useState<string | null>(null);

  const [
    activeTab,
    setActiveTab,
  ] = useState<TABKEY>(currentTab);

  const debouncedSearch =
    useDebounce(search, 500);

  const updateStatusMutation =
    useDroppedorSuspendedAgentStatus();

  useEffect(() => {
    const currentSearch =
      searchParams.get("search") ?? "";

    const nextSearch =
      debouncedSearch.trim();

    if (
      currentSearch === nextSearch
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    if (nextSearch === "") {
      params.delete("search");
    } else {
      params.set(
        "search",
        nextSearch
      );
    }

    params.set("page", "1");

    router.replace(
      `${pathname}?${params.toString()}`,
      {
        scroll: false,
      }
    );
  }, [
    debouncedSearch,
    pathname,
    router,
    searchParams,
  ]);

  const {
    data,
    isLoading,
  } = useMasterlistAgents({
    page,
    search: debouncedSearch,
    status: activeTab,
  });

  const updateQueryParams = (
    key: string,
    value: string | number
  ) => {
    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    if (value === "") {
      params.delete(key);
    } else {
      params.set(
        key,
        String(value)
      );
    }

    const nextUrl =
      `${pathname}?${params.toString()}`;

    router.replace(nextUrl, {
      scroll: false,
    });
  };

  const handleRemoveAgent = async (
    agentId: string,
    status: "DROPPED" | "SUSPENDED"
  ) => {
    const action =
      status === "DROPPED"
        ? "Drop"
        : "Suspend";

    SweetAlert.confirmationAlert(
      `${action} Agent`,
      `Are you sure you want to ${action.toLowerCase()} this agent?`,
      async () => {
        try {
          SweetAlert.loadingAlert(
            `${action}ing Agent`,
            "Please wait..."
          );

          await updateStatusMutation.mutateAsync({
            agentId,
            status,
          });

          Swal.close();

          await SweetAlert.successAlert(
            `${action} Successful`,
            `Agent ${action.toLowerCase()}d successfully`
          );
        } catch (error) {
          console.error(error);

          Swal.close();

          SweetAlert.errorAlert(
            `${action} Failed`,
            "Something went wrong."
          );
        }
      }
    );
  };

  const handleEditAgent = (
    agentId: string
  ) => {
    setSelectedAgentId(agentId);
    setIsEditModalOpen(true);
  };

  const handleCloseEditAgent =
    () => {
      setIsEditModalOpen(false);
      setSelectedAgentId(null);
    };

  const TABS: {
    key: TABKEY;
    label: string;
    icon: React.ElementType;
  }[] = [
    {
      key: "ACTIVE",
      label: "Active",
      icon: UserCheck,
    },
    {
      key: "PROBATION",
      label: "Probation",
      icon: CalendarX2,
    },
    {
      key: "EXPIRED",
      label: "Expired",
      icon: CalendarX2,
    },
    {
      key: "SUSPENDED",
      label: "Suspended",
      icon: UserX,
    },
    {
      key: "DROPPED",
      label: "Dropped",
      icon: UserMinus,
    },
  ];

  const changeTab = (
    tab: TABKEY
  ) => {
    if (tab === activeTab) {
      return;
    }

    setActiveTab(tab);

    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    params.set("tab", tab);
    params.set("page", "1");

    router.replace(
      `${pathname}?${params.toString()}`,
      {
        scroll: false,
      }
    );
  };

  return (
    <div className="w-full flex flex-col gap-y-custom-32 px-custom-32 py-custom-48">
      <div className="flex justify-between">
        <ModuleHeader
          title="Agent"
          subtitle="Masterlist"
        />

        <div className="w-full flex justify-end">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="
              max-w-80
              min-w-80
              h-custom-48
              rounded-md
              border
              border-slate-300
              px-4
              outline-none
              focus:ring-1
              focus:ring-mainPrimary
              focus:border-mainPrimary
              transition
              shadow-sm
            "
          />
        </div>
      </div>

      <AppsTab
        tabs={TABS}
        activeTab={activeTab}
        changeTab={(key) =>
          changeTab(
            key as TABKEY
          )
        }
      />

      <div
        className="
          w-full
          flex
          flex-col
          gap-y-custom-32
        "
      >
        <div className="bg-white shadow-sm rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="bg-white text-tertiaryHeader">
              <tr className="text-neutralPrimary">
                <th className="text-left px-custom-24 py-5 font-semibold">
                  QR-ID
                </th>

                <th className="text-left px-custom-24 py-5 font-semibold">
                  Fullname
                </th>

                <th className="text-left px-custom-24 py-5 font-semibold">
                  Level
                </th>

                <th className="text-left px-custom-24 py-5 font-semibold">
                  Status
                </th>

                <th className="text-left px-custom-24 py-5 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-10"
                  >
                    Loading...
                  </td>
                </tr>
              )}

              {!isLoading &&
                data?.data.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="
                        text-center
                        py-10
                        text-neutralPrimary
                      "
                    >
                      NO{" "}
                      {activeTab}{" "}
                      AGENTS FOUND.
                    </td>
                  </tr>
                )}

              {!isLoading &&
                data?.data.map(
                  (
                    agent,
                    index
                  ) => (
                    <tr
                      key={
                        agent.id ??
                        index
                      }
                      className="
                        text-neutralPrimary
                        text-body
                        odd:bg-neutralLight
                      "
                    >
                      <td className="text-left px-6 py-4 font-semibold">
                        <QRCode
                          value={
                            agent.agentCode ||
                            ""
                          }
                          size={50}
                        />
                      </td>

                      <td className="text-left px-6 py-4 font-semibold capitalize">
                        {
                          agent.fullName
                        }
                      </td>

                      <td className="text-left px-6 py-4 font-semibold">
                        {agent.level}
                      </td>

                      <td className="text-left px-6 py-4">
                        <span
                          className={`
                            inline-flex
                            items-center
                            justify-center
                            w-fit
                            rounded-md
                            px-custom-16
                            py-1
                            text-xs
                            font-semibold
                            text-white
                            ${
                              agent.status ===
                              "ACTIVE"
                                ? "bg-positive"
                                : agent.status ===
                                    "EXPIRED"
                                  ? "bg-negative"
                                  : agent.status ===
                                      "DROPPED"
                                    ? "bg-darkPrimary"
                                    : agent.status ===
                                        "SUSPENDED"
                                      ? "bg-secondary"
                                      : "bg-neutralPrimary"
                            }
                          `}
                        >
                          {
                            agent.status
                          }
                        </span>
                      </td>

                      <td className="text-left px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            title="Edit Details"
                            onClick={() =>
                              handleEditAgent(
                                agent.id
                              )
                            }
                            className="
                              px-custom-8
                              py-custom-8
                              rounded-xl
                              bg-secondary
                              hover:bg-amber-500
                              cursor-pointer
                              text-white
                              inline-flex
                              items-end
                              gap-custom-8
                              text-xs
                              font-semibold
                              transition
                            "
                          >
                            <Edit
                              size={
                                20
                              }
                            />
                          </button>

                          <button
                            type="button"
                            title="View Details"
                            onClick={() =>
                              router.push(
                                `/Agents/profile/${agent.id}`
                              )
                            }
                            className="
                              px-custom-8
                              py-custom-8
                              rounded-xl
                              bg-lightPrimary
                              hover:bg-mainPrimary
                              cursor-pointer
                              text-white
                              inline-flex
                              items-end
                              gap-custom-8
                              text-xs
                              font-semibold
                              transition
                            "
                          >
                            <Inspect
                              size={
                                20
                              }
                            />
                          </button>

                          <div className="relative">
                            <button
                              type="button"
                              title="Agent Action"
                              onClick={() =>
                                setOpenDropdown(
                                  openDropdown ===
                                    agent.id
                                    ? null
                                    : agent.id
                                )
                              }
                              className="
                                px-custom-8
                                py-custom-8
                                rounded-xl
                                bg-negative
                                hover:bg-red-900
                                text-white
                                inline-flex
                                items-center
                                gap-custom-8
                                text-xs
                                font-semibold
                                transition
                              "
                            >
                              <Trash
                                size={
                                  20
                                }
                              />
                            </button>

                            {openDropdown ===
                              agent.id && (
                              <div
                                className="
                                  absolute
                                  right-0
                                  mt-2
                                  w-40
                                  bg-white
                                  border
                                  border-neutralMed
                                  rounded-lg
                                  shadow-lg
                                  z-50
                                "
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRemoveAgent(
                                      agent.id,
                                      "DROPPED"
                                    );

                                    setOpenDropdown(
                                      null
                                    );
                                  }}
                                  className="
                                    w-full
                                    cursor-pointer
                                    text-left
                                    font-bold
                                    px-4
                                    py-2
                                    hover:bg-red-50
                                    text-negative
                                  "
                                >
                                  Drop
                                  Agent
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRemoveAgent(
                                      agent.id,
                                      "SUSPENDED"
                                    );

                                    setOpenDropdown(
                                      null
                                    );
                                  }}
                                  className="
                                    w-full
                                    cursor-pointer
                                    text-left
                                    font-bold
                                    px-4
                                    py-2
                                    hover:bg-yellow-50
                                    text-secondary
                                  "
                                >
                                  Suspend
                                  Agent
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                )}
            </tbody>
          </table>

          <div
            className="
              flex
              items-center
              justify-between
              px-custom-32
              py-4
              border-t
              border-neutralMed
              bg-white
            "
          >
            <div className="text-sm text-neutralPrimary">
              Showing page{" "}
              <span className="font-semibold">
                {data?.page ||
                  1}
              </span>{" "}
              of{" "}
              <span className="font-semibold">
                {data?.totalPages ||
                  1}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={
                  page === 1
                }
                onClick={() =>
                  updateQueryParams(
                    "page",
                    page - 1
                  )
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  px-4
                  py-2
                  rounded-lg
                  border
                  border-neutralMed
                  hover:bg-neutralLight
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  transition
                "
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div
                className="
                  w-full
                  px-custom-16
                  py-1
                  rounded-lg
                  bg-mainPrimary
                  text-white
                  flex
                  items-center
                  justify-center
                  font-semibold
                "
              >
                {page}
              </div>

              <button
                type="button"
                disabled={
                  page >=
                  (data?.totalPages ||
                    1)
                }
                onClick={() =>
                  updateQueryParams(
                    "page",
                    page + 1
                  )
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  px-4
                  py-2
                  rounded-lg
                  border
                  border-neutralMed
                  hover:bg-neutralLight
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  transition
                "
              >
                Next

                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <EditAgentModal
          open={
            isEditModalOpen
          }
          agentId={
            selectedAgentId
          }
          onClose={
            handleCloseEditAgent
          }
        />
      )}
    </div>
  );
}

export default function Masterlist() {
  return (
    <Suspense
      fallback={
        <div className="w-full flex items-center justify-center py-10">
          Loading agents...
        </div>
      }
    >
      <MasterlistContent />
    </Suspense>
  );
}