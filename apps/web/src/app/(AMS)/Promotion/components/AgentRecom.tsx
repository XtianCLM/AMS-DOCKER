"use client";

import {
  useRef,
  useState,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  CircleX,
  Save,
} from "lucide-react";

import {
  AgentLevel,
} from "@repo/shared";

import {
  useAgentPromotionRecommendations,
  useApprovePromotionRecommendation,
  useRejectPromotionRecommendation,
} from "@/hooks/agents/useAgent";

import {
  useAvailableReassignmentUplines,
} from "@/hooks/reassignment/useReassignment";

import MainModal from "@/components/modal/mainModal";
import SweetAlert from "@/components/modal/Swal";


import { getErrorMessage } from "@/components/helper/errorHelper";
import Swal from "sweetalert2";
import axios from "axios";
import { getAllowedLevelOptions } from "../../Agents/helper/level.helper";
import ModuleHeader from "@/components/ui/commonUi/page.header";

export default function AgentRecom() {
  /* =========================================================
     TABLE
  ========================================================= */

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState<
    | "ALL"
    | "PENDING"
    | "PROMOTED"
    | "REJECTED"
  >("PENDING");

  const {
    data,
    isLoading,
  } =
    useAgentPromotionRecommendations({
      page,
      limit: 10,
      search,
      status,
    });

  const {
    mutateAsync:
      approvePromotionRecommendation,

    isPending:
      isPromotingAgent,
  } =
    useApprovePromotionRecommendation();

  const {
    mutateAsync:
      rejectRecommendation,

    isPending:
      isRejectingRecommendation,
  } =
    useRejectPromotionRecommendation();

  /* =========================================================
     SELECTED RECOMMENDATION
  ========================================================= */

  const [
    selectedRecomId,
    setSelectedRecomId,
  ] = useState<string | null>(null);

  const [
    selectedAgentId,
    setSelectedAgentId,
  ] = useState<string | null>(null);

  const [
    selectedAgentCode,
    setSelectedAgentCode,
  ] = useState("");

  const [
    currentAgentLevel,
    setCurrentAgentLevel,
  ] = useState<AgentLevel | null>(null);

  const [
    promotionLevel,
    setPromotionLevel,
  ] = useState<AgentLevel | null>(
    null
  );


  // Rejected States
  const [
    isRejectModalOpen,
    setIsRejectModalOpen,
  ] = useState(false);

  const [
    selectedRejectRecomId,
    setSelectedRejectRecomId,
  ] = useState<string | null>(
    null
  );

  const [
    rejectionRemarks,
    setRejectionRemarks,
  ] = useState("");

  /* =========================================================
     PROMOTION MODAL
  ========================================================= */

  const [
    isApprovingRecom,
    setIsApprovingRecom,
  ] = useState(false);

  const allowedLevelOptions =
    currentAgentLevel
      ? getAllowedLevelOptions(
          currentAgentLevel
        ).filter(
          (level) =>
            level !== currentAgentLevel
        )
      : [];

  const handlePromoteAgent = (
    recommendationId: string,
    agentId: string,
    agentCode: string,
    agentLevel: AgentLevel
  ) => {
    const promotionOptions =
      getAllowedLevelOptions(
        agentLevel
      ).filter(
        (level) =>
          level !== agentLevel
      );

    setSelectedRecomId(
      recommendationId
    );

    setSelectedAgentId(
      agentId
    );

    setSelectedAgentCode(
      agentCode
    );

    setCurrentAgentLevel(
      agentLevel
    );

    setPromotionLevel(
      promotionOptions.length > 0
        ? promotionOptions[0] as AgentLevel
        : null
    );

    setIsApprovingRecom(
      true
    );
  };

  /* =========================================================
     UPLINE SELECTION
  ========================================================= */

  const [
    isUplineModalOpen,
    setIsUplineModalOpen,
  ] = useState(false);

  const [
    newUplineId,
    setNewUplineId,
  ] = useState("");

  const [
    uplineSearch,
    setUplineSearch,
  ] = useState("");

  const [
    showUplineOptions,
    setShowUplineOptions,
  ] = useState(false);

  const uplineDropdownRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const promotedAgentIds =
    selectedAgentId
      ? [selectedAgentId]
      : [];

  const {
    data: uplineData,
    isLoading: isLoadingUplines,
    isError: isUplineError,
  } =
    useAvailableReassignmentUplines(
      selectedAgentId ?? "",
      promotedAgentIds
    );

  const availableUplines =
    uplineData?.data ?? [];

  const filteredUplines =
    availableUplines.filter(
      (upline) => {
        const keyword =
          uplineSearch
            .trim()
            .toLowerCase();

        const matchesLevel =
          upline.level === "L1";

        const matchesStatus =
          upline.status ===
          "ACTIVE";

        const isNotCurrentAgent =
          upline.id !==
          selectedAgentId;

        const matchesSearch =
          !keyword ||
          upline.fullName
            .toLowerCase()
            .includes(keyword) ||
          upline.agentCode
            .toLowerCase()
            .includes(keyword);

        return (
          matchesLevel &&
          matchesStatus &&
          isNotCurrentAgent &&
          matchesSearch
        );
      }
    );

  /* =========================================================
     RESET
  ========================================================= */

  const resetPromotionState =
    () => {
      setSelectedRecomId(null);
      setSelectedAgentId(null);
      setSelectedAgentCode("");

      setCurrentAgentLevel(
        null
      );

      setPromotionLevel(null);

      setNewUplineId("");
      setUplineSearch("");

      setShowUplineOptions(
        false
      );

      setIsApprovingRecom(
        false
      );

      setIsUplineModalOpen(
        false
      );
    };

  const closePromotionModal =
    () => {
      resetPromotionState();
    };

  /*
    If admin cancels the upline modal,
    return to the promotion modal instead
    of completely cancelling everything.
  */
  const closeUplineModal =
    () => {
      setIsUplineModalOpen(
        false
      );

      setNewUplineId("");
      setUplineSearch("");

      setShowUplineOptions(
        false
      );

      setIsApprovingRecom(
        true
      );
    };

  /* =========================================================
     SAVE PROMOTION LEVEL
  ========================================================= */

  const handleSavePromotion =
  async () => {
    if (
      !selectedRecomId ||
      !currentAgentLevel ||
      !promotionLevel
    ) {
      SweetAlert.errorAlert(
        "Missing Information",
        "Unable to process this promotion."
      );

      return;
    }

    const isL3ToL2 =
      currentAgentLevel === "L3" &&
      promotionLevel === "L2";

    /*
     * L3 -> L2 needs upline selection first.
     */
    if (isL3ToL2) {
      setIsApprovingRecom(false);

      setNewUplineId("");
      setUplineSearch("");
      setShowUplineOptions(false);

      setIsUplineModalOpen(true);

      return;
    }

    try {
      const result =
        await approvePromotionRecommendation({
          recommendationId:
            selectedRecomId,

          payload: {
            PromotedTo:
              promotionLevel,

            newUplineId:
              null,
          },
        });

      console.log(
        "PROMOTION RESULT:",
        result
      );

      SweetAlert.successAlert(
        "Promotion Successful",
        "Agent has been promoted successfully."
      );

      resetPromotionState();
    } catch (error) {
      SweetAlert.errorAlert(
        "Promotion Failed",
        getErrorMessage(error)
      );
    }
  };

  /* =========================================================
     CONFIRM L3 -> L2
  ========================================================= */

const handleConfirmL3ToL2Promotion =
  async () => {
    if (
      !selectedRecomId ||
      !currentAgentLevel ||
      !promotionLevel
    ) {
      SweetAlert.errorAlert(
        "Missing Information",
        "Promotion information is incomplete."
      );

      return;
    }

    if (!newUplineId) {
      SweetAlert.errorAlert(
        "Upline Required",
        "Please select a new L1 upline."
      );

      return;
    }

    try {
      const result =
        await approvePromotionRecommendation({
          recommendationId:
            selectedRecomId,

          payload: {
            PromotedTo:
              promotionLevel,

            newUplineId:
              newUplineId,
          },
        });

      console.log(
        "L3 -> L2 PROMOTION RESULT:",
        result
      );

      SweetAlert.successAlert(
        "Promotion Successful",
        "Agent has been promoted to L2 and assigned to the selected L1 upline."
      );

      resetPromotionState();
    } catch (error) {
      SweetAlert.errorAlert(
        "Promotion Failed",
        getErrorMessage(error)
      );
    }
  };

  const handleOpenRejectModal = (
      recommendationId: string
    ) => {
      setSelectedRejectRecomId(
        recommendationId
      );

      setRejectionRemarks("");

      setIsRejectModalOpen(true);
    };

    const handleCloseRejectModal = () => {
    if (
      isRejectingRecommendation
    ) {
      return;
    }

    setIsRejectModalOpen(false);

    setSelectedRejectRecomId(
      null
    );

    setRejectionRemarks("");
  };

  const handleConfirmReject =
    async () => {
      if (
        !selectedRejectRecomId
      ) {
        return;
      }

      const remarks =
        rejectionRemarks.trim();

      if (!remarks) {
        SweetAlert.errorAlert(
          "Reason Required",
          "Please provide a reason for rejecting this recommendation."
        );

        return;
      }

      try {
        SweetAlert.loadingAlert(
          "Rejecting Recommendation",
          "Please wait..."
        );

        const result =
          await rejectRecommendation({
            RecomId:
              selectedRejectRecomId,

            payload: {
              remarks,
            },
          });

        Swal.close();

        console.log(
          "REJECTED RECOMMENDATION:",
          result
        );

        setIsRejectModalOpen(
          false
        );

        setSelectedRejectRecomId(
          null
        );

        setRejectionRemarks("");

        await SweetAlert.successAlert(
          "Recommendation Rejected",
          "The promotion recommendation has been rejected successfully."
        );
      } catch (error) {
        Swal.close();

        let errorMessage =
          "Unable to reject the recommendation.";

        if (
          axios.isAxiosError<{
            message?: string;
          }>(error)
        ) {
          errorMessage =
            error.response?.data
              ?.message ??
            errorMessage;
        } else if (
          error instanceof Error
        ) {
          errorMessage =
            error.message;
        }

        SweetAlert.errorAlert(
          "Rejection Failed",
          errorMessage
        );
      }
    };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className="
        w-full
        flex
        flex-col
        gap-y-custom-24
      "
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="
          flex
          flex-col
          md:flex-row
          md:items-center
          justify-between
          gap-custom-16
        "
      >


        <ModuleHeader
            title="Promotion"
            subtitle="Recommendations"
        />

        <div
          className="
            flex
            gap-custom-8
          "
        >
          <input
            type="text"
            value={search}
            onChange={(
              event
            ) => {
              setSearch(
                event.target.value
              );

              setPage(1);
            }}
            placeholder="Search agent..."
            className="
              rounded-lg
              border
              border-neutralMed
              px-custom-16
              py-custom-8
            "
          />

          <select
            value={status}
            onChange={(
              event
            ) => {
              setStatus(
                event.target.value as
                  | "ALL"
                  | "PENDING"
                  | "PROMOTED"
                  | "REJECTED"
              );

              setPage(1);
            }}
            className="
              rounded-lg
              border
              border-neutralMed
              px-custom-16
              py-custom-8
            "
          >
            <option value="ALL">
              All
            </option>

            <option value="PENDING">
              Pending
            </option>

            <option value="PROMOTED">
              Promoted
            </option>

            <option value="REJECTED">
              Rejected
            </option>
          </select>
        </div>
      </div>

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div
        className="
          overflow-hidden
          rounded-xl
          bg-white
          shadow-sm
        "
      >
        <div className="overflow-x-auto">
          <table
            className="
              w-full
              border-collapse
            "
          >
            <thead>
              <tr
                className="
                  text-neutralPrimary
                "
              >
                <th className="text-left px-custom-24 py-5">
                  Date
                </th>

                <th className="text-left px-custom-24 py-5">
                  Agent
                </th>

                <th className="text-left px-custom-24 py-5">
                  Rec. By
                </th>

                <th className="text-left px-custom-24 py-5">
                  Remarks
                </th>

                <th className="text-left px-custom-24 py-5">
                  Status
                </th>

                <th className="text-center px-custom-24 py-5">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {/* LOADING */}

              {isLoading && (
                <tr>
                  <td
                    colSpan={6}
                    className="
                      py-10
                      text-center
                    "
                  >
                    Loading...
                  </td>
                </tr>
              )}

              {/* EMPTY */}

              {!isLoading &&
                data?.data.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="
                        py-10
                        text-center
                        text-neutralPrimary
                      "
                    >
                      No promotion
                      recommendations found.
                    </td>
                  </tr>
                )}

              {/* DATA */}

              {!isLoading &&
                data?.data.map(
                  (
                    recommendation
                  ) => (
                    <tr
                      key={
                        recommendation.id
                      }
                      className="
                        text-body
                        text-neutralPrimary
                        odd:bg-neutralLight
                      "
                    >
                      {/* DATE */}

                      <td className="px-custom-24 py-custom-16">
                        {new Date(
                          recommendation
                            .createdAt
                        ).toLocaleString()}
                      </td>

                      {/* AGENT */}

                      <td
                        className="
                          px-custom-24
                          py-custom-16
                          font-semibold
                          capitalize
                        "
                      >
                        <div
                          className="
                            flex
                            flex-col
                            gap-1
                          "
                        >
                          <span>
                            {
                              recommendation
                                .agent
                                .fullName
                            }
                          </span>

                          <span
                            className="
                              text-xs
                              font-normal
                              text-neutralPrimary
                            "
                          >
                            {
                              recommendation
                                .agent
                                .agentCode
                            }

                            {" • "}

                            {
                              recommendation
                                .agent
                                .level
                            }
                          </span>
                        </div>
                      </td>

                      {/* RECOMMENDED BY */}

                      <td className="px-custom-24 py-custom-16">
                        {recommendation
                          .submittedByUser
                          ?.name ?? "-"}
                      </td>

                      {/* REMARKS */}

                      <td className="px-custom-24 py-custom-16">
                        {recommendation
                          .remarks ?? "-"}
                      </td>

                      {/* STATUS */}

                      <td className="px-custom-24 py-custom-16">
                        <span
                          className={`
                            inline-flex
                            rounded-lg
                            px-custom-16
                            py-1
                            text-xs
                            font-semibold
                            text-white

                            ${
                              recommendation.status ===
                              "PROMOTED"
                                ? "bg-positive"
                                : recommendation.status ===
                                  "REJECTED"
                                ? "bg-negative"
                                : "bg-secondary"
                            }
                          `}
                        >
                          {
                            recommendation.status
                          }
                        </span>
                      </td>

                      {/* ACTIONS */}

                      <td
                        className="
                          px-custom-24
                          py-custom-16
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            justify-center
                            gap-3
                          "
                        >
                          {recommendation.status ===
                            "PENDING" && (
                            <>
                              <button
                                type="button"
                                title="Promote Agent"
                                onClick={() =>
                                  handlePromoteAgent(
                                    recommendation.id,

                                    recommendation
                                      .agent
                                      .id,

                                    recommendation
                                      .agent
                                      .agentCode,

                                    recommendation
                                      .agent
                                      .level as AgentLevel
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
                                  items-center
                                  gap-custom-8
                                  text-xs
                                  font-semibold
                                  transition
                                "
                              >
                                <Save
                                  size={
                                    20
                                  }
                                />
                              </button>

                              <button
                                type="button"
                                title="Reject Recommendation"
                                onClick={() =>
                                  handleOpenRejectModal(
                                    recommendation.id
                                  )
                                }
                                className="
                                  px-custom-8
                                  py-custom-8
                                  rounded-xl
                                  bg-negative
                                  hover:bg-red-900
                                  cursor-pointer
                                  text-white
                                  inline-flex
                                  items-center
                                  gap-custom-8
                                  text-xs
                                  font-semibold
                                  transition
                                "
                              >
                                <CircleX size={20} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
            </tbody>
          </table>
        </div>

        {/* ===================================================
            PAGINATION
        =================================================== */}

        <div
          className="
            flex
            items-center
            justify-between
            border-t
            border-neutralMed
            px-custom-24
            py-custom-16
          "
        >
          <div
            className="
              text-sm
              text-neutralPrimary
            "
          >
            Page{" "}

            <span className="font-semibold">
              {data?.page ?? 1}
            </span>

            {" "}of{" "}

            <span className="font-semibold">
              {data?.totalPages ??
                1}
            </span>
          </div>

          <div
            className="
              flex
              gap-custom-8
            "
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage(
                  (
                    previous
                  ) =>
                    Math.max(
                      previous -
                        1,
                      1
                    )
                )
              }
              className="
                inline-flex
                items-center
                gap-2
                rounded-lg
                border
                border-neutralMed
                px-custom-16
                py-custom-8
                cursor-pointer
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <ChevronLeft
                size={16}
              />

              Previous
            </button>

            <button
              type="button"
              disabled={
                page >=
                (data?.totalPages ??
                  1)
              }
              onClick={() =>
                setPage(
                  (
                    previous
                  ) =>
                    previous +
                    1
                )
              }
              className="
                inline-flex
                items-center
                gap-2
                rounded-lg
                border
                border-neutralMed
                px-custom-16
                py-custom-8
                cursor-pointer
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Next

              <ChevronRight
                size={16}
              />
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          PROMOTION LEVEL MODAL
      ===================================================== */}

      {isApprovingRecom && (
        <MainModal
          size="md"
          onClose={
            closePromotionModal
          }
        >
          <div
            className="
              flex
              flex-col
              gap-custom-24
              p-custom-32
            "
          >
            <div>
              <h1
                className="
                  text-mdHeader
                  font-bold
                  text-mainPrimary
                "
              >
                Promote Agent
              </h1>

              <p
                className="
                  mt-2
                  text-sm
                  text-neutralPrimary
                "
              >
                Review the agent&apos;s
                current level and select
                the promotion level.
              </p>
            </div>

            {/* AGENT INFO */}

            <div
              className="
                grid
                grid-cols-1
                gap-custom-16
                md:grid-cols-2
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-y-custom-8
                "
              >
                <label
                  className="
                    text-xs
                    font-bold
                  "
                >
                  Agent Code
                </label>

                <input
                  type="text"
                  readOnly
                  value={
                    selectedAgentCode
                  }
                  className="
                    cursor-not-allowed
                    rounded-lg
                    border
                    border-neutralMed
                    bg-gray-100
                    px-custom-16
                    py-3
                    text-neutralPrimary
                  "
                />
              </div>

              <div
                className="
                  flex
                  flex-col
                  gap-y-custom-8
                "
              >
                <label
                  className="
                    text-xs
                    font-bold
                  "
                >
                  Current Level
                </label>

                <input
                  type="text"
                  readOnly
                  value={
                    currentAgentLevel ??
                    ""
                  }
                  className="
                    cursor-not-allowed
                    rounded-lg
                    border
                    border-neutralMed
                    bg-gray-100
                    px-custom-16
                    py-3
                    text-neutralPrimary
                  "
                />
              </div>
            </div>

            {/* PROMOTION LEVEL */}

            <div
              className="
                flex
                flex-col
                gap-y-custom-8
              "
            >
              <label
                htmlFor="promotionLevel"
                className="
                  text-xs
                  font-bold
                "
              >
                Promote To
              </label>

              <select
                id="promotionLevel"
                value={
                  promotionLevel ??
                  ""
                }
                disabled={
                  allowedLevelOptions.length ===
                  0
                }
                onChange={(
                  event
                ) =>
                  setPromotionLevel(
                    event
                      .target
                      .value as AgentLevel
                  )
                }
                className="
                  rounded-lg
                  border
                  border-neutralMed
                  bg-neutralLight
                  px-custom-16
                  py-3
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {allowedLevelOptions.length ===
                0 ? (
                  <option value="">
                    No promotion level
                    available
                  </option>
                ) : (
                  allowedLevelOptions.map(
                    (
                      level
                    ) => (
                      <option
                        key={
                          level
                        }
                        value={
                          level
                        }
                      >
                        {
                          level
                        }
                      </option>
                    )
                  )
                )}
              </select>
            </div>

            {/* L3 -> L2 NOTICE */}

            {currentAgentLevel ===
              "L3" &&
              promotionLevel ===
                "L2" && (
                <div
                  className="
                    rounded-lg
                    border
                    border-lightPrimary
                    bg-blue-50
                    px-custom-16
                    py-custom-16
                    text-sm
                    text-mainPrimary
                  "
                >
                  Promoting an L3
                  agent to L2 requires
                  assigning a new
                  active L1 upline.
                </div>
              )}

            {/* BUTTONS */}

            <div
              className="
                flex
                justify-end
                gap-custom-16
                border-t
                border-neutralMed
                pt-custom-16
              "
            >
              <button
                type="button"
                onClick={
                  closePromotionModal
                }
                className="
                  rounded-lg
                  border
                  border-neutralMed
                  px-custom-24
                  py-3
                  font-semibold
                  text-neutralPrimary
                  cursor-pointer
                  hover:bg-neutralLight
                "
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isPromotingAgent ||
                  !promotionLevel
                }
                onClick={
                  handleSavePromotion
                }
                className="
                  rounded-lg
                  bg-mainPrimary
                  px-custom-24
                  py-3
                  font-semibold
                  text-white
                  cursor-pointer
                  hover:bg-lightPrimary
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
              {isPromotingAgent
                ? "Promoting..."
                : currentAgentLevel === "L3" &&
                  promotionLevel === "L2"
                ? "Next"
                : "Save Promotion"}
              </button>
            </div>
          </div>
        </MainModal>
      )}

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <MainModal
          size="md"
          onClose={
            handleCloseRejectModal
          }
        >
          <div
            className="
              flex
              flex-col
              gap-custom-24
              p-custom-32
            "
          >
            <div>
              <h1
                className="
                  text-mdHeader
                  font-bold
                  text-negative
                "
              >
                Reject Promotion
                Recommendation
              </h1>

              <p
                className="
                  mt-2
                  text-sm
                  text-neutralPrimary
                "
              >
                Please provide the reason
                why this promotion
                recommendation is being
                rejected.
              </p>
            </div>

            <div
              className="
                flex
                flex-col
                gap-y-custom-8
              "
            >
              <label
                htmlFor="rejectionRemarks"
                className="
                  text-sm
                  font-semibold
                  text-neutralPrimary
                "
              >
                Rejection Reason
              </label>

              <textarea
                id="rejectionRemarks"
                rows={5}
                value={
                  rejectionRemarks
                }
                onChange={(event) =>
                  setRejectionRemarks(
                    event.target.value
                  )
                }
                placeholder="Enter rejection reason..."
                className="
                  w-full
                  resize-none
                  rounded-lg
                  border
                  border-neutralMed
                  bg-neutralLight
                  px-custom-16
                  py-3
                  outline-none
                  focus:border-negative
                  focus:ring-1
                  focus:ring-negative
                "
              />
            </div>

            <div
              className="
                flex
                justify-end
                gap-custom-16
                border-t
                border-neutralMed
                pt-custom-16
              "
            >
              <button
                type="button"
                disabled={
                  isRejectingRecommendation
                }
                onClick={
                  handleCloseRejectModal
                }
                className="
                  rounded-lg
                  border
                  border-neutralMed
                  px-custom-24
                  py-3
                  font-semibold
                  text-neutralPrimary
                  hover:bg-neutralLight
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isRejectingRecommendation ||
                  !rejectionRemarks.trim()
                }
                onClick={
                  handleConfirmReject
                }
                className="
                  rounded-lg
                  bg-negative
                  px-custom-24
                  py-3
                  font-semibold
                  text-white
                  hover:bg-red-900
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {isRejectingRecommendation
                  ? "Rejecting..."
                  : "Reject Recommendation"}
              </button>
            </div>
          </div>
        </MainModal>
      )}

      {/* =====================================================
          SELECT NEW UPLINE MODAL
      ===================================================== */}

      {isUplineModalOpen && (
        <MainModal
          size="md"
          onClose={
            closeUplineModal
          }
        >
          <div
            className="
              flex
              flex-col
              gap-custom-24
              p-custom-32
            "
          >
            <div>
              <h1
                className="
                  text-mdHeader
                  font-bold
                  text-mainPrimary
                "
              >
                Select New Upline
              </h1>

              <p
                className="
                  mt-2
                  text-sm
                  text-neutralPrimary
                "
              >
                This agent is being
                promoted from L3 to
                L2. Select an active
                L1 agent as the new
                upline.
              </p>
            </div>

            {/* PROMOTION SUMMARY */}

            <div
              className="
                grid
                grid-cols-2
                gap-custom-16
              "
            >
              <div
                className="
                  rounded-lg
                  bg-neutralLight
                  p-custom-16
                "
              >
                <p
                  className="
                    text-xs
                    text-neutralPrimary
                  "
                >
                  Agent
                </p>

                <p
                  className="
                    font-bold
                    text-mainPrimary
                  "
                >
                  {selectedAgentCode}
                </p>
              </div>

              <div
                className="
                  rounded-lg
                  bg-neutralLight
                  p-custom-16
                "
              >
                <p
                  className="
                    text-xs
                    text-neutralPrimary
                  "
                >
                  Promotion
                </p>

                <p
                  className="
                    font-bold
                    text-mainPrimary
                  "
                >
                  {currentAgentLevel}
                  {" → "}
                  {promotionLevel}
                </p>
              </div>
            </div>

            {/* UPLINE SEARCH */}

            <div
              ref={
                uplineDropdownRef
              }
              className="
                relative
                flex
                flex-col
                gap-y-custom-8
              "
            >
              <label
                htmlFor="newUpline"
                className="
                  text-sm
                  font-semibold
                  text-neutralPrimary
                "
              >
                New L1 Upline
              </label>

              <div className="relative">
                <input
                  id="newUpline"
                  type="text"
                  autoComplete="off"
                  value={
                    uplineSearch
                  }
                  placeholder="Search or select an L1 upline..."
                  onFocus={() =>
                    setShowUplineOptions(
                      true
                    )
                  }
                  onClick={() =>
                    setShowUplineOptions(
                      true
                    )
                  }
                  onChange={(
                    event
                  ) => {
                    setUplineSearch(
                      event.target
                        .value
                    );

                    setNewUplineId(
                      ""
                    );

                    setShowUplineOptions(
                      true
                    );
                  }}
                  className="
                    h-custom-48
                    w-full
                    rounded-md
                    border
                    border-slate-300
                    px-4
                    pr-10
                    outline-none
                    focus:border-mainPrimary
                    focus:ring-1
                    focus:ring-mainPrimary
                  "
                />

                {uplineSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setUplineSearch(
                        ""
                      );

                      setNewUplineId(
                        ""
                      );

                      setShowUplineOptions(
                        true
                      );
                    }}
                    className="
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-lg
                      font-bold
                      text-slate-400
                      hover:text-red-500
                      cursor-pointer
                    "
                  >
                    ×
                  </button>
                )}
              </div>

              {newUplineId && (
                <p
                  className="
                    text-xs
                    font-semibold
                    text-positive
                  "
                >
                  Upline selected
                </p>
              )}

              {/* OPTIONS */}

              {showUplineOptions && (
                <div
                  className="
                    absolute
                    top-full
                    z-50
                    mt-2
                    max-h-64
                    w-full
                    overflow-y-auto
                    rounded-md
                    border
                    border-slate-200
                    bg-white
                    shadow-lg
                  "
                >
                  {isLoadingUplines ? (
                    <div
                      className="
                        px-4
                        py-3
                        text-sm
                        text-slate-500
                      "
                    >
                      Loading uplines...
                    </div>
                  ) : isUplineError ? (
                    <div
                      className="
                        px-4
                        py-3
                        text-sm
                        text-negative
                      "
                    >
                      Unable to load
                      eligible uplines.
                    </div>
                  ) : filteredUplines.length ===
                    0 ? (
                    <div
                      className="
                        px-4
                        py-3
                        text-sm
                        text-slate-500
                      "
                    >
                      No active L1
                      uplines found.
                    </div>
                  ) : (
                    filteredUplines.map(
                      (
                        upline
                      ) => (
                        <button
                          key={
                            upline.id
                          }
                          type="button"
                          onClick={() => {
                            setNewUplineId(
                              upline.id
                            );

                            setUplineSearch(
                              `${upline.fullName} - ${upline.agentCode}`
                            );

                            setShowUplineOptions(
                              false
                            );
                          }}
                          className="
                            w-full
                            border-b
                            border-slate-100
                            px-4
                            py-3
                            text-left
                            cursor-pointer
                            hover:bg-slate-50
                          "
                        >
                          <div
                            className="
                              flex
                              flex-col
                            "
                          >
                            <span
                              className="
                                text-sm
                                font-semibold
                                text-neutralPrimary
                              "
                            >
                              {
                                upline.fullName
                              }
                            </span>

                            <span
                              className="
                                text-xs
                                text-slate-500
                              "
                            >
                              {
                                upline.agentCode
                              }

                              {" • "}

                              {
                                upline.level
                              }

                              {" • "}

                              {
                                upline.status
                              }
                            </span>
                          </div>
                        </button>
                      )
                    )
                  )}
                </div>
              )}
            </div>

            {/* BUTTONS */}

            <div
              className="
                flex
                justify-end
                gap-custom-16
                border-t
                border-neutralMed
                pt-custom-16
              "
            >
              <button
                type="button"
                onClick={
                  closeUplineModal
                }
                className="
                  rounded-lg
                  border
                  border-neutralMed
                  px-custom-24
                  py-3
                  font-semibold
                  cursor-pointer
                  hover:bg-neutralLight
                "
              >
                Back
              </button>

              <button
                type="button"
                disabled={
                  !newUplineId ||
                  isPromotingAgent
                }
                onClick={
                  handleConfirmL3ToL2Promotion
                }
                className="
                  rounded-lg
                  bg-mainPrimary
                  px-custom-24
                  py-3
                  font-semibold
                  text-white
                  cursor-pointer
                  hover:bg-lightPrimary
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {isPromotingAgent
                  ? "Promoting..."
                  : "Confirm Promotion"}
              </button>
            </div>
          </div>
        </MainModal>
      )}
    </div>
  );
}