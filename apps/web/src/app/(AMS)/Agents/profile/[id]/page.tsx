"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Bell, X, ArrowLeft, Activity,
  ShoppingCart,
  Wallet,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Edit, } from "lucide-react";
import { useMemo, useState } from "react";
import { useAgentDetails, useAgentTransactions } from "@/hooks/agents/useAgent";
import QRCode from "react-qr-code";
import AppsTab from "@/components/ui/commonUi/general.tab";
import { AgentNotification, AgentTransaction } from "@repo/shared";
import { socket } from "@/lib/socket";
import { useEffect } from "react";
import EditAgentModal from "../../components/EditAgentModal";
import { getAssetUrl } from "@/lib/getAssetUrl";


type TABKEY =
  | "all-activities"
  | "sales"
  | "commission";

export default function AgentDetailsPage() {

  const router = useRouter();

  const params = useParams();

  
  const searchParams =
      useSearchParams();

  const [
    realtimeNotifications,
    setRealtimeNotifications,
  ] = useState<AgentNotification[]>([]);

  const initialTab =
      (searchParams.get(
        "tab"
      ) as TABKEY) ??
      "all-activities";
  
  const page =
    Number(
      searchParams.get("page")
    ) || 1;
  
  const [activeTab, setActiveTab] =
      useState<TABKEY>(
        initialTab
      );



  const TABS: {
    key: TABKEY;
    label: string;
    icon: React.ElementType;
  }[] = [
    {
      key: "all-activities",
      label: "Activities",
      icon: Activity,
    },
    {
      key: "sales",
      label:
        "Sales",
      icon: ShoppingCart,
    },
    {
      key: "commission",
      label:
        "Commission",
      icon: Wallet,
    },
    //  {
    //   key: "withrawal",
    //   label:
    //     "Withrawal",
    //   icon: RefreshCw,
    // },
  ];



  const changeTab = (
    tab: TABKEY
  ) => {
    setActiveTab(tab);

    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    params.set("tab", tab);

    router.replace(
      `?${params.toString()}`,
      {
        scroll: false,
      }
    );
  };

  const updateQueryParams = (
    key: string,
    value: string | number
  ) => {

    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    params.set(
      key,
      String(value)
    );

    router.replace(
      `?${params.toString()}`,
      {
        scroll: false,
      }
    );
  };


  const [showNotification, setShowNotification] =
    useState(false);

  const {data: agent, isLoading, error } = useAgentDetails({agentId:params.id as string});

  

  const [downlineTab, setDownlineTab] =
  useState<"L2" | "L3">("L2");

  const DOWNLINES_PER_PAGE = 5;

  const [downlinePage, setDownlinePage] =
    useState(1);

  const shouldShowDownlineTable =
    agent?.level !== "L3";

  const filteredDownlines =
    agent?.level === "L1"
      ? (agent?.downlines ?? []).filter(
          (downline) =>
            downline.level === downlineTab
        )
      : agent?.downlines ?? [];

  const totalDownlinePages = Math.max(
    1,
    Math.ceil(
      filteredDownlines.length /
        DOWNLINES_PER_PAGE
    )
  );

  const validDownlinePage = Math.min(
    downlinePage,
    totalDownlinePages
  );

  const paginatedDownlines =
    filteredDownlines.slice(
      (validDownlinePage - 1) *
        DOWNLINES_PER_PAGE,
      validDownlinePage *
        DOWNLINES_PER_PAGE
    );

  const handleDownlineTabChange = (
    tab: "L2" | "L3"
  ) => {
    setDownlineTab(tab);
    setDownlinePage(1);
  };

  useEffect(() => {

        if (!agent?.id) return;

        socket.emit(
          "join-agent-room",
          agent.id
        );

      }, [agent?.id]);

  useEffect(() => {

      socket.on(
        "new-notification",
        (
          notification: AgentNotification
        ) => {

          setRealtimeNotifications(
            (prev) => [
              notification,
              ...prev,
            ]
          );
        }
      );

    return () => {

        socket.off(
          "new-notification"
        );
      };

    }, []);



  const profilePictureUrl =
   getAssetUrl(
           agent?.profilePicture
       );

  const {
      data: transactionData,
      isLoading:
        transactionLoading,
    } = useAgentTransactions({

      agentId:
        params.id as string,

      page,

      limit: 10,
    });

  
  const filteredTransactions = useMemo(() => {
      if (!transactionData?.data) return [];
  
      switch (activeTab) {
        case "all-activities":
          return transactionData.data;
  
        case "sales":
          return transactionData.data.filter(
            (transaction: AgentTransaction) =>
              transaction.commissionType ===
              "DIRECT"
          );
        
        case "commission":
          return transactionData.data.filter(
            (transaction: AgentTransaction) =>
              transaction.commissionType ===
              "DOWNLINE"
          );

        // case "withrawal":
        //   return transactionData.data.filter(
        //     (transaction: AgentTransaction) =>
        //       transaction.commissionType ===
        //       "WITHDRAW"
        //   );
    
  
        default:
          return [];
      }
    }, [activeTab, transactionData]);



  const notifications = useMemo(() => {

    const merged = [
      ...realtimeNotifications,
      ...(agent?.notifications || []),
    ];

    return merged.filter(
      (notification, index, self) =>
        index ===
        self.findIndex(
          (n) =>
            n.id === notification.id
        )
    );

  }, [
    realtimeNotifications,
    agent?.notifications,
  ]);

  const [
    isEditAgentModalOpen,
    setIsEditAgentModalOpen,
  ] = useState(false);

  const handleOpenEditAgent = () => {
    setIsEditAgentModalOpen(true);
  };

  const handleCloseEditAgent = () => {
    setIsEditAgentModalOpen(false);
  };

  return (
    <div className="relative flex flex-col">

      <div
        className="
          absolute
          left-custom-48
          -top-2
          inline-flex
          items-center
          gap-x-custom-8
          px-custom-16
          py-custom-8
          rounded-xl
          hover:bg-neutralLight
          transition-all
          duration-200
          cursor-pointer
          group
          z-50
        "
        onClick={() =>
          router.push("/Agents")
        }
      >

        <button
          className="
            w-7
            h-7
            rounded-xl
            border
            border-neutralMed
            flex
            items-center
            justify-center
            bg-white
            group-hover:border-mainPrimary
            transition
            cursor-pointer
          "
        >
          <ArrowLeft
            size={15}
            className="
              group-hover:text-mainPrimary
              transition
            "
          />
        </button>

        <p
          className="
            text-sm
            font-medium
            text-neutralPrimary
            group-hover:text-mainPrimary
            transition
          "
        >
          Go Back to Masterlist
        </p>

      </div>

      <div
        className="
          relative
          w-full
          flex
          flex-col
          gap-y-custom-32
          px-custom-32
          pt-custom-64
          pb-custom-32
        "
      >
      
        {/* MOBILE / MD TOGGLE BUTTON */}
        {!showNotification && (
          <button
            onClick={() =>
              setShowNotification(true)
            }
            className="
              lg:hidden
              fixed
              top-1
              right-6
              z-50
              w-12
              h-12
              rounded-full
              bg-mainPrimary
              text-white
              flex
              items-center
              justify-center
              shadow-lg
              hover:bg-lightPrimary
              cursor-pointer
              transition
            "
          >
            <Bell size={22} />
          </button>
        )}
        {/* MAIN GRID */}


        {isLoading && (
          <div>
            Loading agent details...
          </div>
        )}

        {error && (
          <div className="text-negative">
            Failed to fetch agent
          </div>
        )}

        {!isLoading && agent && (
        <div className="flex flex-col gap-custom-24">
          <div
            className="
              w-full
              grid
              grid-cols-1
              lg:grid-cols-[70%_28%]
              gap-custom-24
              relative
            "
          >
          
            <div
              className="
                w-full
                min-h-150
                bg-white
                lg:border-r-2
                lg:border-neutralMed
                flex flex-col gap-y-custom-32
                pr-custom-24
              "
            >
              <div className="grid
                              grid-cols-1
                              lg:grid-cols-[20%_73%]
                              gap-x-custom-48
                              gap-y-custom-32
              ">
              <div
                className="
                  group
                  relative
                  w-fit
                  overflow-hidden
                  rounded-lg
                  bg-neutralLight
                  p-custom-8
                  shadow-md
                "
              >
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt={`${agent.fullName ?? "Agent"} profile`}
                    className="
                      h-32
                      w-32
                      rounded-md
                      border
                      border-neutralMed
                      object-cover
                    "
                  />
                ) : (
                  <div
                    className="
                      flex
                      h-32
                      w-32
                      items-center
                      justify-center
                      rounded-md
                      bg-neutralMed
                      text-center
                      text-sm
                      text-neutralPrimary
                    "
                  >
                    No profile
                    <br />
                    picture
                  </div>
                )}

                <div
                  className="
                    absolute
                    inset-2
                    flex
                    items-center
                    justify-center
                    rounded-md
                    bg-black/45
                    opacity-0
                    transition-opacity
                    duration-200
                    group-hover:opacity-100
                  "
                >
                  <button
                    type="button"
                    onClick={handleOpenEditAgent}
                    className="
                          px-custom-16
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
                    <Edit size={16} />

                    Edit
                  </button>
                </div>
              </div>
                <div className="w-full flex flex-col gap-y-custom-24">
                    <div className="w-full flex justify-between items-center flex-wrap gap-custom-16">
                        <h1 className="text-secondaryHeader font-bold text-mainPrimary">{agent?.fullName}</h1>
                        
                    </div>
                    <div className="grid md:grid-cols-2 gap-custom-16">
                        <div className="w-full flex justify-start gap-x-custom-16 items-center bg-neutralLight p-custom-8 rounded-md">
                          <strong className="text-darkPrimary text-body">({agent?.level})</strong>
                          <h6 className="text-body font-bold text-neutralPrimary">Agent Level</h6>
                        </div>
                        <div className="w-full flex justify-start gap-x-custom-16 items-center bg-neutralLight p-custom-8 rounded-md">
                          <strong className="text-darkPrimary text-body">
                            (
                              {agent?.maintenanceCycles?.[0]
                                ?.remainingSales ?? 0}
                            )
                          </strong>
                          <h6 className="text-body font-bold text-neutralPrimary">Sales Maintenance</h6>
                        </div>
                        <div className="w-full flex justify-start gap-x-custom-16 items-center bg-neutralLight p-custom-8 rounded-md">
                          <strong
                            className={`
                              text-body
                              text-secondary
                            `}
                          >({agent?.creditScore})</strong>
                          <h6 className="text-body font-bold text-neutralPrimary">Credit Score</h6>
                        </div>
                        <p className={`py-custom-8 px-custom-16 rounded-xl text-center text-body text-white font-medium
                            ${agent.status === "ACTIVE"
                                ? "bg-positive"
                                : agent.status === "EXPIRED"
                                ? "bg-negative"
                                : agent.status === "DROPPED"
                                ? "bg-darkPrimary"
                                : agent.status === "SUSPENDED"
                                ? "bg-secondary"
          
                                : "bg-neutralPrimary"}
                         `}>{agent?.status}
                         </p>
                    </div>
                </div>
              </div>
              <div className="flex flex-col gap-y-custom-32">
                  {/* MAIN TABS */}
                  <AppsTab
                    tabs={TABS}
                    activeTab={activeTab}
                    changeTab={(key) =>
                      changeTab(
                        key as TABKEY
                      )
                    }
                  />
              <div className="bg-white shadow-sm rounded-xl overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead className="bg-white text-tertiaryHeader">
                      <tr className="text-neutralPrimary">
                        <th className="text-left px-custom-24 py-5 font-semibold">
                          Transaction Date
                        </th>
                        <th className="text-left px-custom-24 py-5 font-semibold">
                          Type
                        </th>
                        <th className="text-left px-custom-24 py-5 font-semibold">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* LOADING */}
                      {transactionLoading && (
                        <tr>
                          <td
                            colSpan={3}
                            className="text-center py-10"
                          >
                            Loading...
                          </td>
                        </tr>
                      )}
                      {/* EMPTY */}
                      {!transactionLoading &&
                        filteredTransactions.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="
                                text-center
                                py-16
                                text-neutralPrimary
                              "
                            >
                              <div className="flex flex-col items-center gap-3">
                                <div
                                  className="
                                    w-16
                                    h-16
                                    rounded-full
                                    bg-neutralLight
                                    flex
                                    items-center
                                    justify-center
                                  "
                                >
                                  <Wallet
                                    className="
                                      w-8
                                      h-8
                                      text-neutralPrimary
                                    "
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <h3 className="font-semibold text-body">
                                    No Transactions Found
                                  </h3>
                                  <p className="text-sm text-neutralPrimary">
                                    No available records for this tab.
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                      )}
                      {/* DATA */}
                      {!transactionLoading &&
                        filteredTransactions.map(
                          (transaction) => (
                            <tr
                              key={transaction.id}
                              className="
                                text-neutralPrimary
                                text-body
                                odd:bg-neutralLight
                              "
                            >
                              {/* DATE */}
                              <td className="text-left px-6 py-4 font-semibold">
                                <div className="flex flex-col">
                                  <span>
                                    {new Date(
                                      transaction.createdAt
                                    ).toLocaleDateString()}
                                  </span>
                                  <span className="text-xs text-neutralPrimary">
                                    {new Date(
                                      transaction.createdAt
                                    ).toLocaleTimeString()}
                                  </span>
                                </div>
                              </td>
                              {/* TYPE */}
                              <td className="text-left px-6 py-4">
                                <div
                                  className="
                                    inline-flex
                                    items-center
                                    px-custom-16
                                    py-custom-8
                                    rounded-xl
                                    bg-mainPrimary
                                    text-white
                                    text-xs
                                    font-semibold
                                  "
                                >
                                  {transaction.commissionType}
                                </div>
                              </td>
                              {/* DETAILS */}
                              <td className="text-left px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <strong className="text-mainPrimary">
                                    ₱
                                    {transaction.commissionAmount}
                                  </strong>
                                  <p className="text-sm">
                                    Sale Amount:
                                    {" "}
                                    ₱
                                    {transaction.saleAmount}
                                  </p>
                                  <p className="text-sm text-neutralPrimary">
                                    Source Agent:
                                    {" "}
                                    {
                                      transaction.sourceAgent
                                        .fullName
                                    }
                                  </p>
                                  <p className="text-xs text-neutralPrimary">
                                    Level:
                                    {" "}
                                    {
                                      transaction.sourceLevel
                                    }
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                    </tbody>
                  </table>
                  {/* PAGINATION */}
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
                        {transactionData?.page || 1}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold">
                        {transactionData?.totalPages || 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* PREVIOUS */}
                      <button
                        disabled={page === 1}
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
                      {/* PAGE */}
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
                      {/* NEXT */}
                      <button
                        disabled={
                          page >=
                          (transactionData?.totalPages || 1)
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
          
            </div>
          
            <div
              className="
                hidden
                lg:flex
                w-full
                bg-white
                flex-col
              "
            >
              <h2
                className="
                  text-secondaryHeader
                  font-bold
                  text-mainPrimary
                "
              >
                Notifications
              </h2>
              <div className="mt-6 flex flex-col gap-y-custom-16 overflow-y-auto max-h-146">
                  {notifications.length === 0 ? (
                    <div
                      className="
                        w-full
                        border
                        border-dashed
                        border-neutralMed
                        rounded-xl
                        p-custom-24
                        text-center
                        text-neutralPrimary
                      "
                    >
                      No notifications found.
                    </div>
                  ) : (
                    notifications.map(
                      (notification) => (
                        <div
                          key={`${notification.id}-${notification.createdAt}`}
                          className={`
                            w-full
                            rounded-xl
                            p-custom-16
                            border
                            transition
                            text-sm
                            ${
                              notification.isRead
                                ? "border-neutralMed bg-white"
                                : "border-mainPrimary bg-mainPrimary/5"
                            }
                          `}
                        >
                          {/* HEADER */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col gap-1">
                              <h3
                                className={`
                                  font-semibold
                                  ${
                                    notification.isRead
                                      ? "text-neutralPrimary"
                                      : "text-mainPrimary"
                                  }
                                `}
                              >
                                {notification.title}
                              </h3>
                              <p
                                className="
                                  text-xs
                                  text-neutralPrimary
                                  leading-relaxed
                                "
                              >
                                {notification.message}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <div
                                className="
                                  w-3
                                  h-3
                                  rounded-full
                                  bg-mainPrimary
                                  mt-1
                                "
                              />
                            )}
                          </div>
                          {/* FOOTER */}
                          <div
                            className="
                              pt-custom-8
                              border-t
                              border-neutralLight
                              flex
                              flex-col
                              gap-y-custom-16
                              items-end
                              justify-between
                            "
                          >
                          <span
                              className={`
                                text-xs
                                font-semibold
                                px-3
                                py-1
                                rounded-full
                                ${
                                  notification.type ===
                                  "MAINTENANCE_WARNING"
                                    ? "bg-yellow-100 text-secondary"
                                    : notification.type ===
                                      "MAINTENANCE_EXPIRED"
                                    ? "bg-red-100 text-negative"
                                    : notification.type ===
                                      "MAINTENANCE_COMPLETED"
                                    ? "bg-green-100 text-positive"
                                    : "bg-blue-100 text-lightPrimary"
                                }
                              `}
                            >
                              {notification.type
                                .replaceAll("_", " ")}
                            </span>
                            <span
                              className="
                                text-xs
                                text-neutralPrimary
                                w-full
                                text-end
                              "
                            >
                              {new Date(
                                notification.createdAt
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>
            </div>
        
          </div>

          {shouldShowDownlineTable && (
            <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-neutralMed">
              <div className="px-custom-24 py-custom-16 border-b border-neutralMed flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-mdHeader font-bold text-mainPrimary">
                    Downline Agents
                  </h2>

                  <p className="text-sm text-neutralPrimary">
                    Agents directly under this agent.
                  </p>
                </div>

                {agent.level === "L1" && (
                  <div className="flex items-center gap-custom-16 bg-neutralLight p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                       handleDownlineTabChange("L2");
                      }}
                      className={`
                        px-custom-16
                        py-custom-8
                        rounded-md
                        text-sm
                        font-semibold
                        transition
                        cursor-pointer
                        hover:scale-105
                        duration-150
                        ease-in-out
                        border
               
                        ${
                          downlineTab === "L2"
                            ? "bg-mainPrimary text-white  border-mainPrimary"
                            : "text-neutralPrimary hover:bg-white  border-neutralPrimary"
                        }
                      `}
                    >
                      Level 2
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                         handleDownlineTabChange("L3");
                      }}
                      className={`
                        px-custom-16
                        py-custom-8
                        rounded-md
                        text-sm
                        font-semibold
                        transition
                        cursor-pointer
                        hover:scale-105
                        duration-150
                        ease-in-out
                        border
                       
                        ${
                          downlineTab === "L3"
                            ? "bg-mainPrimary text-white  border-mainPrimary"
                            : "text-neutralPrimary hover:bg-white  border-neutralPrimary"
                        }
                      `}
                    >
                      Level 3
                    </button>
                  </div>
                )}
              </div>

              <table className="w-full border-collapse">
                <thead className="bg-white text-tertiaryHeader">
                  <tr className="text-neutralPrimary">
                    <th className="text-left px-custom-24 py-4 font-semibold">
                      Name
                    </th>

                    <th className="text-left px-custom-24 py-4 font-semibold">
                      Level
                    </th>

                    <th className="text-left px-custom-24 py-4 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDownlines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center py-10 text-neutralPrimary"
                      >
                        {agent.level === "L1"
                          ? `No ${downlineTab} downline agents found.`
                          : "No downline agents found."}
                      </td>
                    </tr>
                  ) : (
                    paginatedDownlines.map((downline) => (
                      <tr
                        key={downline.id}
                        className="
                          text-neutralPrimary
                          text-body
                          odd:bg-neutralLight
                        "
                      >
                        <td className="text-left px-6 py-4 font-semibold">
                          {downline.fullName}
                        </td>

                        <td className="text-left px-6 py-4">
                          {downline.level}
                        </td>

                        <td className="text-left px-6 py-4">
                          <span
                            className={`
                              px-custom-16
                              py-custom-8
                              rounded-xl
                              text-xs
                              font-semibold
                              text-white
                              ${
                                downline.status === "ACTIVE"
                                  ? "bg-positive"
                                  : downline.status === "EXPIRED"
                                  ? "bg-negative"
                                  : downline.status === "DROPPED"
                                  ? "bg-darkPrimary"
                                  : downline.status === "SUSPENDED"
                                  ? "bg-secondary"
                                  : "bg-mainPrimary"
                              }
                            `}
                          >
                            {downline.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div
                className="
                  flex
                  items-center
                  justify-between
                  px-custom-24
                  py-custom-16
                  border-t
                  border-neutralMed
                "
              >
                <div className="text-sm text-neutralPrimary">
                  Showing{" "}
                  <span className="font-semibold">
                    {paginatedDownlines.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold">
                    {filteredDownlines.length}
                  </span>{" "}
                  downlines
                </div>

                <div className="flex items-center gap-custom-16 text-neutralPrimary">
                  <button
                    type="button"
                    disabled={validDownlinePage === 1}
                    onClick={() =>
                      setDownlinePage((previous) =>
                        Math.max(previous - 1, 1)
                      )
                    }
                    className="
                      px-custom-16
                      py-custom-8
                      rounded-md
                      border
                      border-neutralMed
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                    "
                  >
                    Previous
                  </button>

                  <span className="font-semibold text-sm ">
                    {validDownlinePage} /{" "}
                    {totalDownlinePages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      validDownlinePage >=
                      totalDownlinePages
                    }
                    onClick={() =>
                      setDownlinePage((previous) =>
                        Math.min(
                          previous + 1,
                          totalDownlinePages
                        )
                      )
                    }
                    className="
                      px-custom-16
                      py-custom-8
                      rounded-md
                      border
                      border-neutralMed
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                    "
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}


        </div>

         )}
        {showNotification && (
          <div
            className="
              lg:hidden
              fixed
              inset-0
              z-60
              bg-black/40
              backdrop-blur-[2px]
              flex
              justify-end
            "
          >
            {/* SIDEBAR */}
            <div
              className="
                w-[90%]
                sm:w-105
                h-full
                bg-white
                shadow-2xl
                p-custom-24
                animate-in
                slide-in-from-right
                duration-300
                overflow-y-auto
              "
            >
              <div
                className="
                  w-full
                  flex
                  items-center
                  justify-between
                  border-b
                  border-neutralMed
                  pb-4
                "
              >
                <h2
                  className="
                    text-secondaryHeader
                    font-bold
                    text-mainPrimary
                  "
                >
                  Notifications
                </h2>
                <button
                  onClick={() =>
                    setShowNotification(
                      false
                    )
                  }
                  className="
                    w-10
                    h-10
                    rounded-full
                    bg-neutralLight
                    flex
                    items-center
                    justify-center
                    hover:bg-neutralMed
                    transition
                  "
                >
                  <X size={20} />
                </button>
              </div>



              <div className="mt-6 flex flex-col gap-y-custom-16">

                {notifications.length === 0 ? (

                  <div
                    className="
                      w-full
                      border
                      border-dashed
                      border-neutralMed
                      rounded-xl
                      p-custom-24
                      text-center
                      text-neutralPrimary
                    "
                  >
                    No notifications found.
                  </div>

                ) : (

                  notifications.map(
                    (notification) => (

                      <div
                        key={`${notification.id}-${notification.createdAt}`}
                        className={`
                          w-full
                          rounded-xl
                          p-custom-16
                          border
                          transition
                          ${
                            notification.isRead
                              ? "border-neutralMed bg-white"
                              : "border-mainPrimary bg-mainPrimary/5"
                          }
                        `}
                      >

                        {/* HEADER */}
                        <div className="flex items-start justify-between gap-3">

                          <div className="flex flex-col gap-1">

                            <h3
                              className={`
                                font-semibold
                                ${
                                  notification.isRead
                                    ? "text-neutralPrimary"
                                    : "text-mainPrimary"
                                }
                              `}
                            >
                              {notification.title}
                            </h3>

                            <p
                              className="
                                text-sm
                                text-neutralPrimary
                                leading-relaxed
                              "
                            >
                              {notification.message}
                            </p>

                          </div>

                          {!notification.isRead && (

                            <div
                              className="
                                w-3
                                h-3
                                rounded-full
                                bg-mainPrimary
                                mt-1
                              "
                            />

                          )}

                        </div>

                        {/* FOOTER */}
                        <div
                          className="
                            mt-custom-16
                            pt-custom-16
                            border-t
                            border-neutralLight
                            flex
                            items-center
                            justify-between
                          "
                        >

                          <span
                            className="
                              text-xs
                              text-neutralPrimary
                            "
                          >
                            {new Date(
                              notification.createdAt
                            ).toLocaleString()}
                          </span>

                          <span
                            className={`
                              text-xs
                              font-semibold
                              px-3
                              py-1
                              rounded-full
                              ${
                                notification.type ===
                                "MAINTENANCE_WARNING"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : notification.type ===
                                    "MAINTENANCE_EXPIRED"
                                  ? "bg-red-100 text-red-700"
                                  : notification.type ===
                                    "MAINTENANCE_COMPLETED"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-blue-100 text-blue-700"
                              }
                            `}
                          >
                            {notification.type
                              .replaceAll("_", " ")}
                          </span>

                        </div>

                      </div>
                    )
                  )

                )}

              </div>
            </div>
          </div>
        )}

        {isEditAgentModalOpen&& (
              <EditAgentModal
                open={isEditAgentModalOpen}
                agentId={agent?.id ?? null}
                onClose={handleCloseEditAgent}
              />
            )}
        
      </div>
    </div>
  );
}