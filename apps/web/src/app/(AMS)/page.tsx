"use client";

import dynamic from "next/dynamic";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Users,
  Clock3,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  QrCodeIcon,
  ViewIcon,
  Upload,
} from "lucide-react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useGetClients,
  useGetCommissionDetails,
  useImportClientsDbf,
} from "../../hooks/clients/useClients";

import { Client, EligibleAgentOption } from "@repo/shared";

import MainModal from "@/components/modal/mainModal";
import ModuleHeader from "@/components/ui/commonUi/page.header";
import AppsTab from "@/components/ui/commonUi/general.tab";
import { useCreateCommissionScan, useScannedAgent } from "@/hooks/commission/useCommission";
import QRCode from "react-qr-code";
import { useAuth } from "@/components/context/UserContext";
import SweetAlert from "@/components/modal/Swal";
import { useSearchEligibleAgents } from "@/hooks/general/useGeneral";
import axios from "axios";
import { getAssetUrl } from "@/lib/getAssetUrl";

/* =========================================
   QR SCANNER
========================================= */

const QRScanner = dynamic(
  () => import("@/components/qrComp/qrScanner"),
  {
    ssr: false,
  }
);

/* =========================================
   TYPES
========================================= */

type TABKEY =
  | "daily-client"
  | "pending-commission"
  | "paid-commission";

/* =========================================
   COMPONENT
========================================= */




export default function ClientsPage() {
  const router = useRouter();

  const { user } = useAuth();

  const branchCode =
    user?.branch?.branchCode ??
    null;

  const searchParams = useSearchParams();

  const initialTab =
    (searchParams.get("tab") as TABKEY) ??
    "daily-client";

  const [activeTab, setActiveTab] =
    useState<TABKEY>(initialTab);

  const statusMap: Record<
    TABKEY,
    "NEW" | "PENDING" | "SCANNED"
  > = {
    "daily-client": "NEW",
    "pending-commission":
      "PENDING",
    "paid-commission":
      "SCANNED",
  };

  /* =========================================
     STATES
  ========================================= */

  const [openModal, setOpenModal] =
    useState(false);

  const [viewCommission, setViewCommission] = 
    useState(false);

  const [scanMode, setScanMode] =
    useState<"scan-qr" | "search-agent">(
      "scan-qr"
    );

  const [
    payoutChannel,
    setPayoutChannel,
  ] = useState<"GCASH" | "CHECK">(
    "GCASH"
  );

  
  
  const [selectedPhoneNumber, setSelectedPhoneNumber] =
  useState("");
  const [checkNumber, setCheckNumber] =
  useState("");

  const [qrResult, setQrResult] =
    useState("");

  const [
    isAgentDropdownOpen,
    setIsAgentDropdownOpen,
  ] = useState(false);
  const [
    agentSearch,
    setAgentSearch,
  ] = useState("");

  const [
    selectedAgent,
    setSelectedAgent,
  ] = useState<
    EligibleAgentOption | null
  >(null);

  const {
    data: eligibleAgents = [],
    isLoading:
      isSearchingAgents,
    isFetching:
      isFetchingAgents,
  } =
    useSearchEligibleAgents(
      agentSearch
    );

  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [selectClient, setSelectedClient] = useState("");

  const [selectedScanClientId, setSelectedScanClientId] =
  useState("");

  /* =========================================
     FETCH CLIENTS
  ========================================= */

  const {
    data,
    isLoading,
  } = useGetClients({
    page,
    search,
    status:
      statusMap[activeTab],
  });

  const {
    mutate: createCommission,
    isPending,
  } = useCreateCommissionScan();

  /* =========================================
     TABS
  ========================================= */

  const TABS: {
    key: TABKEY;
    label: string;
    icon: React.ElementType;
  }[] = [
    {
      key: "daily-client",
      label: "Daily SSP Clients",
      icon: Users,
    },
    {
      key: "pending-commission",
      label: "Pending Commissions",
      icon: Clock3,
    },
    {
      key: "paid-commission",
      label: "Paid Commissions",
      icon: BadgeCheck,
    },
  ];

  /* =========================================
     CHANGE TAB
  ========================================= */

  const changeTab = (tab: TABKEY) => {
    setActiveTab(tab);

    setPage(1);

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

  /* =========================================
     FILTERED CLIENTS
  ========================================= */

  const filteredClients =
    data?.data ?? [];


  const handleCloseModal = () => {
    setOpenModal(false);
    setQrResult("");
    setScanMode("scan-qr");

    setPayoutChannel("GCASH");
    setCheckNumber("");

    setViewCommission(false);
  };

  const handleSelectedClient = (id:string) => {
      setSelectedClient(id)
      setViewCommission(true);

  }

  const handleScanningQr = (id:string) => {
      setSelectedScanClientId(id)
      setOpenModal(true);
  }

  const {
    data: commissionDetails,
  } = useGetCommissionDetails(
    selectClient
  );

  const directTransaction =
    commissionDetails?.commissionTransactions.find(
      (t) => t.commissionType === "DIRECT"
    );

  const downlineTransactions =
    commissionDetails?.commissionTransactions.filter(
      (t) => t.commissionType !== "DIRECT"
    ) ?? [];


    const {
      data: scannedAgent,
      isLoading: isScanningAgent,
      error: scannedAgentError,
    } = useScannedAgent({
      agentCode: qrResult,
      clientId:selectedScanClientId,
    });


  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000";

  const profilePictureUrl =
    // scannedAgent?.agent.profilePicture
    //   ? `${API_BASE_URL}${scannedAgent?.agent.profilePicture.trim()}`
    //   : null;
    getAssetUrl(
        scannedAgent?.agent.profilePicture
      );


  // const detailsProfilePictureUrl =
  //   directTransaction?.sourceAgent.profilePicture
  //     ? `${API_BASE_URL}${directTransaction?.sourceAgent.profilePicture.trim()}`
  //     : null;

  const detailsProfilePictureUrl =
      getAssetUrl(
        directTransaction?.sourceAgent.profilePicture
      );
      

  const handleConfirmCommission = () => {
      if (!scannedAgent || !user?.id) {
        return;
      }

      if (!branchCode) {
        SweetAlert.errorAlert(
          "Branch Required",
          "Your account does not have an assigned branch."
        );

        return;
      }

      if (
        payoutChannel === "GCASH" &&
        !selectedPhoneNumber.trim()
      ) {
        SweetAlert.errorAlert(
          "GCash Number Required",
          "Please select a registered GCash number."
        );

        return;
      }

      if (
        payoutChannel === "CHECK" &&
        !checkNumber.trim()
      ) {
        SweetAlert.errorAlert(
          "Check Number Required",
          "Please enter the check number."
        );

        return;
      }

    SweetAlert.confirmationAlert(
      "Confirm Commission",
      "Are you sure you want to credit this commission?",
      () => {

        createCommission(
          {
            clientId:
              scannedAgent.client.id,

            agentId:
              scannedAgent.agent.id,

            branchId:
              branchCode,

            scannedBy:
              user.id,

            payoutChannel: payoutChannel,

            gcashNumber: selectedPhoneNumber,

            checkNumber: checkNumber
          },
          {
            onSuccess: () => {

              SweetAlert.successAlertFunction(
                "Success",
                "Commission successfully credited.",
                () => {
                  // optional refresh logic
                },
                () => {
                  handleCloseModal();
                }
              );

            },

            onError: () => {

              SweetAlert.errorAlert(
                "Error",
                "Failed to create commission."
              );

            },
          }
        );

      }
    );
  };


  // dbf handler 

    
  // Dbf Uploader
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

    if (!file) return;

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
      "Import Daily Clients",
      `Import client data from ${file.name}?`,
      () => {
        importDbf(
          file,
          {
            onSuccess: (
                result
              ) => {
                SweetAlert.successAlert(
                  "Import Successful",
                  `DBF Records: ${result.totalDbfRecords}
                  Valid Records: ${result.validRecords}
                  Inserted: ${result.insertedRecords}`
                );

                setPage(1);
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
                "Import Failed",
                message ??
                  "Failed to import DBF client data."
              );
            },
          }
        );
      }
    );

    /*
    * Reset so user can select
    * the same file again later.
    */
    event.target.value = "";
  };

  /* =========================================
     RENDER
  ========================================= */

    useEffect(() => {
  if (!scannedAgent) {
    setSelectedPhoneNumber("");
    return;
  }

  setSelectedPhoneNumber(
    scannedAgent.agent.telephone ??
    scannedAgent.agent.SecondaryTel ??
    ""
  );
}, [scannedAgent]);

  return (
    <div className="w-full flex flex-col gap-y-custom-32 px-custom-32 py-custom-48 ">

    {/* HEADER */}
    <ModuleHeader
      title="SSP"
      subtitle="Master List"
      search={search}
      setSearch={setSearch}
      setPage={setPage}
    />

    {/* TABS + IMPORT */}
    <div
      className="
        flex
        items-center
        justify-between
        gap-custom-16
      "
    >
      <AppsTab
        tabs={TABS}
        activeTab={activeTab}
        changeTab={(key) =>
          changeTab(
            key as TABKEY
          )
        }
      />

      {activeTab ===
        "daily-client" && (
        <div>
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
            onClick={() =>
              dbfInputRef.current?.click()
            }
            className="
              inline-flex
              items-center
              gap-custom-8
              rounded-xl
              bg-mainPrimary
              px-custom-16
              py-custom-8
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-lightPrimary
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {isImportingDbf ? (
              <>
                <div
                  className="
                    h-4
                    w-4
                    animate-spin
                    rounded-full
                    border-2
                    border-white
                    border-t-transparent
                  "
                />

                Importing...
              </>
            ) : (
              <>
                <Upload
                  size={18}
                />

                Upload DBF
              </>
            )}
          </button>
        </div>
      )}
    </div>

      {/* LOADING */}
      {isLoading && (
        <div className="flex items-center gap-3 text-mainPrimary">

          <div className="w-5 h-5 border-2 border-mainPrimary border-t-transparent rounded-full animate-spin" />

          <span>
            Fetching clients...
          </span>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white shadow-sm">

        <table className="w-full border-collapse">

          <thead className="bg-white text-tertiaryHeader">
            <tr className="text-neutralPrimary">

              <th className="text-left px-custom-24 py-5 font-semibold">
                Client Name
              </th>

              <th className="text-left px-custom-24 py-5 font-semibold">
                Transaction Date
              </th>

              <th className="text-left px-custom-24 py-5 font-semibold">
                Loan Amount
              </th>

              <th className="text-left px-custom-24 py-5 font-semibold">
                Status
              </th>

              <th className="text-center px-custom-24 py-5 font-semibold">
                Action
              </th>
            </tr>
          </thead>

          <tbody>

            {!isLoading &&
              filteredClients.length ===
                0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-10 text-neutralPrimary"
                  >
                    No clients found.
                  </td>
                </tr>
              )}

            {filteredClients.map(
              (
                client: Client,
                index: number
              ) => (
                <tr
                  key={index}
                  className="text-neutralPrimary text-body odd:bg-neutralLight"
                >
                  <td className="text-left px-6 py-4 font-semibold">
                    {
                      client.clientName
                    }
                  </td>

                  <td className="text-left px-6 py-4 font-semibold">
                    {
                      client.createdAt
                    }
                  </td>

                  <td className="text-left px-6 py-4 font-semibold">
                    ₱
                    {client.loanAmount.toLocaleString()}
                  </td>

                  <td>
                    <span
                      className={`text-left px-custom-16 py-custom-8 font-semibold rounded-full text-xs  text-white ${
                        client.clientStatus ===
                        "NEW"
                          ? "bg-positive"
                          : client.clientStatus ===
                            "PENDING"
                          ? "bg-secondary"
                          : "bg-mainPrimary"
                      }`}
                    >
                      {
                        client.clientStatus
                      }
                    </span>
                  </td>

                  <td className="text-center px-custom-24 py-4 font-semibold">

                    
                    {client.clientStatus === "SCANNED" ?(
                        <button
                          title="View Commission Details"
                          className="
                            px-custom-16
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
                            onClick={()=>{
                              handleSelectedClient(client.id);
                            }}
                        >
                          <ViewIcon size={20}/>
                        </button>
                    ):(
                      <button
                      title="Credit Commission"
                      className="
                            px-custom-16
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
                       onClick={()=>{
                              handleScanningQr(client.id);
                            }}
                    >
                      <QrCodeIcon size={20}/>
                    </button>

                    )}
                    


                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div
          className="
            flex items-center justify-between
            px-custom-32 py-4 border-t border-neutralMed
            bg-white
          "
        >

          <div className="text-sm text-neutralPrimary">

            Showing page{" "}

            <span className="font-semibold">
              {data?.page || 1}
            </span>{" "}

            of{" "}

            <span className="font-semibold">
              {data?.totalPages || 1}
            </span>

          </div>

          <div className="flex items-center gap-3">

            {/* PREVIOUS */}
            <button
              disabled={page === 1}
              onClick={() =>
                setPage(
                  (prev) =>
                    prev - 1
                )
              }
              className="
                inline-flex items-center gap-2
                px-4 py-2 rounded-lg
                border border-neutralMed
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
                w-full px-custom-16 py-1
                rounded-lg
                bg-mainPrimary
                text-white
                flex items-center justify-center
                font-semibold
              "
            >
              {page}
            </div>

            {/* NEXT */}
            <button
              disabled={
                page ===
                  data?.totalPages ||
                filteredClients.length ===
                  0
              }
              onClick={() =>
                setPage(
                  (prev) =>
                    prev + 1
                )
              }
              className="
                inline-flex items-center gap-2
                px-4 py-2 rounded-lg
                border border-neutralMed
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


        {/* MODAL */}
        {openModal && (
          <MainModal
            size={scannedAgent ? "xxl" : "sm"}
            
            onClose={handleCloseModal}
          >

            <div>

              
                 {/* TOP PROMPT */}
            {(isScanningAgent || scannedAgentError) && (
              <div
                className="
                  absolute
                  top-0
                  z-50
                  w-full
                  flex
                  justify-start
                  items-start
                  pointer-events-none
                "
              >
                {/* LOADING */}
                {isScanningAgent && (
                  <div
                    className="
                      bg-white
                      px-custom-16
                      py-1
                      rounded-tl-lg
                      rounded-br-lg
                      shadow-xl
                      flex
                      items-center
                      gap-3
                      border
                      border-mainPrimary/20
                      pointer-events-auto
                    "
                  >
                    <div className="w-5 h-5 border-2 border-mainPrimary border-t-transparent rounded-full animate-spin" />

                    <p className="text-mainPrimary font-medium">
                      Fetching agent...
                    </p>
                  </div>
                )}

                {/* ERROR */}
                {!isScanningAgent && scannedAgentError && (
                  <div
                    className="
                      bg-negative
                      text-white
                      px-custom-16
                      py-1
                      rounded-tl-lg
                      rounded-br-lg
                      shadow-xl
                      font-semibold
                      pointer-events-auto
                      text-xs
                    "
                  >
                    Agent not found
                  </div>
                )}
              </div>
            )}


              <div
                className={`
                  w-full
                  transition-all
                  duration-500
                  ease-in-out
                  ${scannedAgent ? "0" : "py-custom-8"}
                  ${
                    scannedAgent
                      ? "grid grid-cols-2 gap-custom-32"
                      : "flex flex-col"
                  }
                `}
              >
              
                {/* =========================================
                    LEFT SIDE
                ========================================= */}
              <div className="w-full flex flex-col gap-custom-32 py-custom-32 justify-center items-start">
                  {/* HEADER */}
                  {scanMode === "scan-qr" ? (
                  <div className="w-full flex flex-col gap-custom-8 items-center">
                    <h1 className="text-secondaryHeader text-mainPrimary font-bold">
                      Scan QR Code
                    </h1>
                    <p className="text-neutralPrimary font-normal text-body">
                      Place QR inside the frame to scan
                    </p>
                  </div>):(
                  <div className="w-full flex flex-col gap-custom-8 items-center">
                    <h1 className="text-secondaryHeader text-mainPrimary font-bold">
                      Search Eligible Agent
                    </h1>
                    <p className="text-neutralPrimary font-normal text-body">
                      Find an agent by entering their full name or agent code.
                    </p>
                  </div>
                  )}
                  {/* QR / AGENT SEARCH */}
                  <div className="w-full flex justify-center items-center">
                    {scanMode === "scan-qr" ? (
                      <div className="w-full flex flex-col items-center gap-4">
                        <QRScanner
                          onScan={(text: string) => {
                            const cleaned =
                              text.trim();

                            setQrResult(
                              cleaned
                            );

                            setSelectedAgent(
                              null
                            );

                            setAgentSearch("");
                          }}
                        />
                      </div>
                    ) : (
                      <div className="relative w-full max-w-105">
                        <input
                          type="text"
                          placeholder="Search agent name or code"
                          value={
                            selectedAgent
                              ? `${selectedAgent.fullName}`
                              : agentSearch
                          }
                          onChange={(e) => {
                            const value =
                              e.target.value;

                            setAgentSearch(
                              value
                            );

                            setSelectedAgent(
                              null
                            );

                            setQrResult("");

                            setIsAgentDropdownOpen(
                              true
                            );
                          }}
                          onFocus={() => {
                            setIsAgentDropdownOpen(
                              true
                            );
                          }}
                          className="
                            w-full
                            border
                            border-neutralMed
                            rounded-xl
                            px-4 py-3
                            pr-16
                            outline-none
                            focus:border-mainPrimary
                          "
                        />

                        {selectedAgent && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAgent(
                                null
                              );

                              setAgentSearch("");

                              setQrResult("");

                              setIsAgentDropdownOpen(
                                false
                              );
                            }}
                            className="
                              absolute
                              right-3
                              top-1/2
                              -translate-y-1/2
                              text-sm
                              text-gray-500
                              hover:text-gray-800
                            "
                          >
                            Clear
                          </button>
                        )}

                        {isAgentDropdownOpen &&
                          !selectedAgent &&
                          agentSearch.trim().length >= 2 && (
                            <div
                              className="
                                absolute
                                left-0
                                right-0
                                top-full
                                z-50
                                mt-2
                                max-h-64
                                overflow-y-auto
                                rounded-xl
                                border
                                border-neutralMed
                                bg-white
                                shadow-lg
                              "
                            >
                              {isSearchingAgents ? (
                                <div className="px-4 py-3 text-sm text-gray-500">
                                  Searching agents...
                                </div>
                              ) : eligibleAgents.length > 0 ? (
                                eligibleAgents.map(
                                  (agent) => (
                                    <button
                                      key={agent.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedAgent(
                                          agent
                                        );

                                        setQrResult(
                                          agent.agentCode
                                        );

                                        setAgentSearch("");

                                        setIsAgentDropdownOpen(
                                          false
                                        );
                                      }}
                                      className="
                                        flex
                                        w-full
                                        items-center
                                        justify-between
                                        gap-4
                                        border-b
                                        border-gray-100
                                        px-4 py-3
                                        text-left
                                        last:border-b-0
                                        hover:bg-gray-50
                                      "
                                    >
                                      <div>
                                        <p className="font-medium text-gray-900">
                                          {
                                            agent.fullName
                                          }
                                        </p>

                                        <p className="text-sm text-gray-500">
                                          {
                                            agent.agentCode
                                          }
                                        </p>
                                      </div>

                                      <div className="text-right">
                                        <p className="text-xs font-medium text-gray-600">
                                          {
                                            agent.level
                                          }
                                        </p>

                                        <p className="text-xs text-green-600">
                                          {
                                            agent.status
                                          }
                                        </p>
                                      </div>
                                    </button>
                                  )
                                )
                              ) : (
                                <div className="px-4 py-3 text-sm text-gray-500">
                                  No eligible agents found.
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                  {/* SWITCH */}
                  <div className="w-full px-custom-64">
                    <ul className="bg-neutralMed rounded-xl w-full p-2 flex justify-between gap-2">
                      {/* SCAN QR */}
                      <li
                        onClick={() =>
                          setScanMode(
                            "scan-qr"
                          )
                        }
                        className={`
                          flex-1 text-center py-3 rounded-lg cursor-pointer transition-all
                          ${
                            scanMode === "scan-qr"
                              ? "bg-white text-neutralPrimary font-semibold shadow-sm"
                              : "text-white"
                          }
                        `}
                      >
                        Scan QR
                      </li>
                      {/* ENTER CODE */}
                      <li
                        onClick={() =>
                          setScanMode(
                            "search-agent"
                          )
                        }
                        className={`
                          flex-1 text-center py-3 rounded-lg cursor-pointer transition-all
                          ${
                            scanMode === "search-agent"
                              ? "bg-white text-neutralPrimary font-semibold shadow-sm"
                              : "text-white"
                          }
                        `}
                      >
                        Search Agent
                      </li>
                    </ul>
                  </div>
                </div>
              
                {/* =========================================
                    RIGHT SIDE
                ========================================= */}
                {scannedAgent && (
                  <div
                    className="
                      w-full
                      bg-mainPrimary
                      bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,0.45),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(30,64,175,0.25),transparent_35%)
                      p-custom-32
                      rounded-tr-lg
                      rounded-br-lg
                      text-white
                      animate-in
                      fade-in
                      slide-in-from-left-5
                      duration-500
                      min-h-125
                      max-h-145
                      overflow-y-auto
                    "
                  >
                    {/* SUCCESS */}
                    {!isScanningAgent &&
                      scannedAgent && (
                        <div className="relative flex flex-col gap-6 h-full">
                          {/* TITLE */}
                          <div className="">
                            <h2 className="text-secondaryHeader">
                              Agent Details
                            </h2>
                          </div>
                          {/* INFO */}
                          <div className="flex gap-6 justify-start items-center">
                        {/* Profile Picture  */}
                            <div
                              className="
                                bg-white
                                rounded-xl
                                p-custom-8
                                w-fit
                                flex
                                items-center
                                justify-center
                              "
                            >
              


                            {profilePictureUrl ? (
                              <img
                                src={profilePictureUrl}
                                alt={`${scannedAgent?.agent.fullName ?? "Agent"} profile`}
                                className="
                                  w-28
                                  h-28
                                  rounded-md
                                  object-cover
                                  border
                                  border-neutralMed
                                "
                              />
                            ) : (
                              <div
                                className="
                                  w-28
                                  h-28
                                  rounded-full
                                  bg-neutralMed
                                  flex
                                  items-center
                                  justify-center
                                  text-sm
                                  text-neutralPrimary
                                  text-center
                                "
                              >
                                No profile <br></br> picture
                              </div>
                            )}
                           
                            </div>
                            {/* DETAILS */}
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col gap-custom-8">
                                <p className="text-tertiaryHeader text-gray-300">
                                  Agent Fullname
                                </p>
                                <p className="text-secondaryHeader font-bold">
                                  {
                                    scannedAgent?.agent.fullName
                                  }
                                </p>
                              </div>
                              <div className="inline-flex flex-wrap gap-custom-16">
                                <p className="text-sm font-semibold text-yellow-300">
                                  ( {
                                    scannedAgent?.agent.level
                                  } )
                                </p>
                                <p className="text-sm text-gray-300">
                                  Current Level
                                </p>
              
                              </div>
                          
                            </div>
                          </div>


                          <div className="w-full border-b border-neutralLight flex flex-col gap-y-custom-8 pb-custom-16">
                              <div className="flex justify-between">
                                      <h6 className="text-mdHeader">Commission</h6>
                                      <p className="text-body"></p>
                              </div>
                              <div className="flex flex-col text-xs">
                                  <div className="flex justify-between items-center gap-custom-8">
                                      <h6 className="text-sm">( {scannedAgent?.agent?.status} ) SCAN STATUS</h6>
                                       <p className="font-bold text-primaryHeader text-yellow-300">
                                        ₱
                                        {Number(
                                         scannedAgent?.directCommission?.amount
                                        ).toLocaleString()}
                                      </p>
                                  </div>
                                  <p className="text-xs text-neutralMed">{scannedAgent?.directCommission?.rule?.piraRate}% Commission Rate</p>
                              </div>
                            </div>

                          {/* PAYOUT CHANNEL */}
                          <div className="w-full flex flex-col gap-y-custom-16">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                Direct Commission Payout
                              </p>

                              <p className="text-xs text-gray-300">
                                Select how the direct commission will be paid.
                              </p>
                            </div>

                            <div
                              className="
                                bg-neutralLight/15
                                rounded-xl
                                w-full
                                p-2
                                grid
                                grid-cols-2
                                gap-2
                              "
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setPayoutChannel("GCASH");
                                  setCheckNumber("");
                                }}
                                className={`
                                  w-full
                                  text-center
                                  py-3
                                  rounded-lg
                                  cursor-pointer
                                  transition-all
                                  ${
                                    payoutChannel === "GCASH"
                                      ? "bg-lightPrimary text-white font-semibold shadow-sm"
                                      : "text-white bg-neutralLight/5 hover:bg-neutralLight/10"
                                  }
                                `}
                              >
                                GCASH
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setPayoutChannel("CHECK")
                                }
                                className={`
                                  w-full
                                  text-center
                                  py-3
                                  rounded-lg
                                  cursor-pointer
                                  transition-all
                                  ${
                                    payoutChannel === "CHECK"
                                      ? "bg-positive text-white font-semibold shadow-sm"
                                      : "text-white bg-neutralLight/5 hover:bg-neutralLight/10"
                                  }
                                `}
                              >
                                CHECK
                              </button>
                            </div>

                            {payoutChannel === "CHECK" ? (
                              <div className="flex flex-col gap-y-custom-8">
                                <label
                                  htmlFor="checkNumber"
                                  className="text-sm font-semibold text-white"
                                >
                                  Check Number
                                </label>

                                <input
                                  id="checkNumber"
                                  type="text"
                                  value={checkNumber}
                                  onChange={(event) =>
                                    setCheckNumber(
                                      event.target.value
                                    )
                                  }
                                  placeholder="Enter check number"
                                  className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-white/20
                                    bg-white
                                    px-4
                                    py-3
                                    text-neutralPrimary
                                    outline-none
                                    transition
                                    focus:border-lightPrimary
                                    focus:ring-2
                                    focus:ring-lightPrimary/30
                                  "
                                />
                              </div>
                            ):(
                              <div className="flex flex-col gap-y-custom-8">
                                <label
                                  htmlFor="gcashNumber"
                                  className="text-sm font-semibold text-white"
                                >
                                  Registered Number
                                </label>

                                <select
                                  id="gcashNumber"
                                  value={selectedPhoneNumber}
                                  onChange={(event) =>
                                    setSelectedPhoneNumber(
                                      event.target.value
                                    )
                                  }
                                  className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-white/20
                                    bg-white
                                    text-neutralPrimary
                                    px-custom-8
                                    py-3
                                    text-md
                                  "
                                >
                                  {!scannedAgent.agent.telephone &&
                                    !scannedAgent.agent.SecondaryTel && (
                                      <option value="">
                                        No registered number
                                      </option>
                                    )}

                                  {scannedAgent.agent.telephone && (
                                    <option
                                      value={
                                        scannedAgent.agent.telephone
                                      }
                                    >
                                      Primary -{" "}
                                      {
                                        scannedAgent.agent.telephone
                                      }
                                    </option>
                                  )}

                                  {scannedAgent.agent.SecondaryTel && (
                                    <option
                                      value={
                                        scannedAgent.agent.SecondaryTel
                                      }
                                    >
                                      Secondary -{" "}
                                      {
                                        scannedAgent.agent.SecondaryTel
                                      }
                                    </option>
                                  )}
                                </select>
                              </div>
                            )}
                          </div>

                            {/* UPLINE COMMISSIONS */}
                            {scannedAgent?.overrideCommissions &&
                              scannedAgent.overrideCommissions.length > 0 && (
                                <div className="flex flex-col gap-y-custom-8">

                                  <div className="flex justify-between">
                                    <h6 className="text-mdHeader">
                                      Upline Commission
                                    </h6>
                                  </div>

                                  {scannedAgent.overrideCommissions.map(
                                    (override, index) => (
                                      <div
                                        key={index}
                                        className="
                                          bg-white/10
                                          border
                                          border-white/20
                                          rounded-xl
                                          p-4
                                          flex
                                          justify-between
                                          items-center
                                        "
                                      >
                                        {/* LEFT */}
                                        <div>
                                          <p className="font-bold text-white">
                                            {override.agent.fullName}
                                          </p>

                                          <p className="text-sm text-gray-300">
                                            ({override.agent.level}) Current Level
                                          </p>

                                          <p
                                            className={`text-xs font-semibold ${
                                              override.agent.status === "ACTIVE"
                                                ? "text-green-300"
                                                : "text-red-300"
                                            }`}
                                          >
                                            {override.agent.status}
                                          </p>

                                          {/* {override.blocked && (
                                            <p className="text-xs text-red-300 mt-1">
                                              BLOCKED
                                            </p>
                                          )}

                                          {override.reason && (
                                            <p className="text-xs text-gray-300">
                                              {override.reason}
                                            </p>
                                          )} */}
                                        </div>

                                        {/* RIGHT */}
                                        <div className="text-right">
                                          <p
                                            className={`font-bold ${
                                              override.blocked
                                                ? "text-red-300"
                                                : "text-yellow-300"
                                            }`}
                                          >
                                            ₱
                                            {Number(
                                              override.amount
                                            ).toLocaleString()}
                                          </p>

                                          <p className="text-xs text-gray-300">
                                            Override Commission
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                            )}

              
              
                          {/* BUTTON */}
                            <button
                              disabled={isPending}
                                onClick={() => {
                                  handleConfirmCommission()
                                }}
                              className="
                                sticky
                                bottom-0
                                mt-4
                                w-full
                                bg-green-500
                                hover:bg-green-600
                                transition
                                rounded-xl
                                py-custom-16
                                font-bold
                                text-body
                                cursor-pointer
                                shadow-xl
                              "
                            >
                              {
                                isPending
                                  ? "Saving..."
                                  : "Confirm Agent Commission"
                              }
                            </button>

                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>

          </MainModal>
        )}


        {viewCommission && (
          <MainModal
            size="xl"
            onClose={handleCloseModal}
          >
            <div className="
              w-full
              grid
              grid-cols-3
              rounded
            ">
              <div
                className="
                  w-full
                  px-custom-24
                  py-custom-24
                  rounded-bl-xl
                  rounded-tl-xl
                  text-mainPrimary
                "
              >
                <div className="flex flex-col gap-custom-16">

                  <div>
                    <h2 className="text-mdHeader font-bold">
                      Sale Details
                    </h2>
                  </div>

                  <div className="flex flex-col gap-y-custom-16">

                    <h6 className="text-body text-neutralPrimary">Client Info</h6>

                    <div className="flex flex-col gap-y-custom-8">
                      <div
                        className="
                          bg-neutralLight
                          py-custom-8
                          px-custom-16
                          rounded-xl
                          w-full
                        "
                      >
                        <h2
                          className="
                            text-xs
                            text-neutralPrimary
                          "
                        >
                          Client Name
                        </h2>
                        <p
                          className="
                            font-bold
                            text-sm
                          "
                        >
                          {commissionDetails?.client.clientName}
                        </p>
                      </div>
                      <div
                        className="
                          bg-neutralLight
                          py-custom-8
                          px-custom-16
                          rounded-xl
                          w-full
                        "
                      >
                        <h2
                          className="
                            text-xs
                            text-neutralPrimary
                          "
                        >
                          Loan Amount
                        </h2>
                        <p
                          className="
                            font-bold
                            text-sm
                          "
                        >
                          ₱
                          {Number(
                            commissionDetails?.client.loanAmount ?? 0
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div
                        className="
                          bg-neutralLight
                          py-custom-8
                          px-custom-16
                          rounded-xl
                          w-full
                        "
                      >
                        <h2
                          className="
                            text-xs
                            text-neutralPrimary
                          "
                        >
                          Loan Term
                        </h2>
                        <p
                          className="
                            font-bold
                            text-sm
                          "
                        >
                          {commissionDetails?.client.term}
                        </p>
                      </div>
                      <div
                        className="
                          bg-neutralLight
                          py-custom-8
                          px-custom-16
                          rounded-xl
                          w-full
                        "
                      >
                        <h2
                          className="
                            text-xs
                            text-neutralPrimary
                          "
                        >
                          Payout Channel
                        </h2>
                        <p
                          className="
                            font-bold
                            text-sm
                          "
                        >
                          {commissionDetails?.payoutChannel}
                        </p>
                      </div>
                    </div>
          
                    <h6 className="text-body text-neutralPrimary">Handled by</h6>

                    <div className="flex flex-col gap-y-custom-8">
                      <div
                        className="
                          bg-neutralLight
                          py-custom-8
                          px-custom-16
                          rounded-xl
                          w-full
                        "
                      >
                        <h2
                          className="
                            text-xs
                            text-neutralPrimary
                          "
                        >
                          Branch Admin
                        </h2>
                        <p
                          className="
                            font-bold
                            text-sm
                          "
                        >
                          {commissionDetails?.scanner?.name ?? "-"}
                        </p>
                      </div>
                      <div
                        className="
                          bg-neutralLight
                          py-custom-8
                          px-custom-16
                          rounded-xl
                          w-full
                        "
                      >
                        <h2
                          className="
                            text-xs
                            text-neutralPrimary
                          "
                        >
                          Scanned Branch
                        </h2>
                        <p
                          className="
                            font-bold
                            text-sm
                          "
                        >
                          {commissionDetails?.branch.companyName}
                        </p>
                      </div>
                      <div
                        className="
                          bg-neutralLight
                          py-custom-8
                          px-custom-16
                          rounded-xl
                          w-full
                        "
                      >
                        <h2
                          className="
                            text-xs
                            text-neutralPrimary
                          "
                        >
                          Sale Reference
                        </h2>
                        <p
                          className="
                            font-bold
                            text-sm
                          "
                        >
                           {commissionDetails?.saleReference ?? "-"}
                        </p>
                      </div>
                    </div>

                  </div>

                </div>
              </div>

              <div className=" min-h-125 max-h-145
                      overflow-y-auto w-full col-span-2 px-custom-24 py-custom-24 rounded-br-xl rounded-tr-xl bg-mainPrimary text-white">
                      <div className="flex flex-col gap-custom-16">

                        {/* DIRECT COMMISSION */}
                        {directTransaction && (
                         <div className="flex flex-col gap-custom-16">
                            {/* TITLE */}
                            <div>
                              <h2 className="text-mdHeader font-bold">
                                Commission Distribution
                              </h2>
                            </div>


                            {/* INFO */}
                            <div className="
                                    bg-white/10
                                    border
                                    border-white/20
                                    rounded-xl
                                    p-4
                                    flex
                                    justify-between
                                    items-center
                                  ">

                              
                              <div className="flex gap-6">
                                {/* Profile Picture */}
                            <div
                              className="
                                bg-white
                                rounded-xl
                                p-custom-8
                                w-fit
                                flex
                                items-center
                                justify-center
                              "
                            >
              


                            {detailsProfilePictureUrl ? (
                              <img
                                src={detailsProfilePictureUrl}
                                alt={`${directTransaction?.sourceAgent.fullName ?? "Agent"} profile`}
                                className="
                                  w-28
                                  h-28
                                  rounded-md
                                  object-cover
                                  border
                                  border-neutralMed
                                "
                              />
                            ) : (
                              <div
                                className="
                                  w-28
                                  h-28
                                  rounded-full
                                  bg-neutralMed
                                  flex
                                  items-center
                                  justify-center
                                  text-sm
                                  text-neutralPrimary
                                  text-center
                                "
                              >
                                No profile <br></br> picture
                              </div>
                            )}
                           
                            </div>
                                {/* DETAILS */}
                                <div className="flex flex-col gap-3 items-start justify-center">
                                      <div>
                                        <p className="text-sm text-gray-300">
                                          Agent Fullname
                                        </p>
                                        <p className="text-xl font-bold">
                                          {
                                            directTransaction?.sourceAgent?.fullName
                                          }
                                        </p>
                                      </div>
                                      <div className="inline-flex flex-wrap gap-custom-16">
                                        <p className="font-semibold text-secondary">
                                          ( {
                                            directTransaction?.sourceAgent?.level
                                          } )
                                        </p>
                                        <p className="text-sm text-gray-300">
                                          Current Level
                                        </p>
                                      </div>
                                      <div className="inline-flex flex-wrap gap-custom-16">
                                        <p className="font-semibold text-positive">
                                          ( {
                                            directTransaction?.sourceAgent?.status
                                          } )
                                        </p>
                                        <p className="text-sm text-gray-300">
                                          Current Status
                                        </p>
                                      </div>
                                  </div>
                                </div>

                                <div>

                                </div>

                            </div>

                            <div className="w-full border-b border-neutralLight flex flex-col gap-y-custom-8 py-custom-16">
                              <div className="flex justify-between">
                                      <h6 className="text-mdHeader">Commission</h6>
                                      <p className="text-body"></p>
                              </div>
                              <div className="flex flex-col">
                                  <div className="flex justify-between items-center">
                                      <h6 className="text-body">( {commissionDetails?.AgentScannedStatus} ) SCAN STATUS</h6>
                                       <p className="font-bold text-secondaryHeader text-yellow-300">
                                        ₱
                                        {Number(
                                          directTransaction?.commissionAmount
                                        ).toLocaleString()}
                                      </p>
                                  </div>
                                  <p className="text-xs text-neutralMed">{directTransaction?.commissionRule?.piraRate}% Commission Rate</p>
                              </div>
                            </div>


                            </div>
                
                        )}

                        {/* RECEIVERS */}
                        {downlineTransactions.length > 0 && (
                            <div className="flex flex-col gap-y-custom-16">
                              <div className="flex justify-between">
                                      <h6 className="text-mdHeader">Upline Commission</h6>
                                      <p className="text-body"></p>
                              </div>
                              {downlineTransactions.map(
                                (transaction) => (
                                  <div
                                    key={transaction.id}
                                    className="
                                      bg-white/10
                                      border
                                      border-white/20
                                      rounded-xl
                                      p-4
                                      flex
                                      justify-between
                                      items-center
                                    "
                                  >
                                    <div>
                                      <p className="font-bold text-white">
                                        {transaction.receiverAgent.fullName}
                                      </p>

                                      <p className="text-sm text-gray-300">
                                       ( {transaction?.receiverLevel} ) Level
                                      </p>
                                    </div>

                                    <div className="text-right">
                                      <p className="font-bold text-yellow-300">
                                        ₱
                                        {Number(
                                          transaction.commissionAmount
                                        ).toLocaleString()}
                                      </p>

                                      <p className="text-xs text-gray-300">
                                        Override Commission
                                      </p>
                                    </div>
                                  </div>
                                )
                              )}

                            </div>
                        )}
                      </div>
              </div>


            </div>
          </MainModal>
        )}
      </div>
    </div>
  );
}