"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";
import Swal from "sweetalert2";

import MainModal from "@/components/modal/mainModal";
import SweetAlert from "@/components/modal/Swal";

import {
  useAgentEditDetails,
  useUpdateAgentDetails,
} from "@/hooks/agents/useAgent";

import { useAvailableReassignmentUplines } from "@/hooks/reassignment/useReassignment";

import {
  AgentFormState,
  emptyAgentForm,
  UpdateAgentDetailsPayload,
} from "@repo/shared";
import { getAllowedLevelOptions } from "../helper/level.helper";
import { normalizePHPhone } from "../helper/phone.helper";



interface EditAgentModalProps {
  open: boolean;
  agentId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function EditAgentModal({
  open,
  agentId,
  onClose,
  onUpdated,
}: EditAgentModalProps) {
  const {
    data: selectedAgentDetails,
    isLoading: isLoadingAgentDetails,
    isError: isAgentDetailsError,
  } = useAgentEditDetails(agentId);

  const {
    mutateAsync: updateAgent,
    isPending: isUpdatingAgent,
  } = useUpdateAgentDetails();

  const [agentForm, setAgentForm] =
    useState<AgentFormState>(emptyAgentForm);

  const [
    isUplineModalOpen,
    setIsUplineModalOpen,
  ] = useState(false);

  const [
    pendingUpdatePayload,
    setPendingUpdatePayload,
  ] = useState<UpdateAgentDetailsPayload | null>(
    null
  );

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
    useRef<HTMLDivElement | null>(null);

  const promotedAgentIds =
    agentId ? [agentId] : [];

  const {
    data: uplineData,
    isLoading: isLoadingUplines,
    isError: isUplineError,
  } = useAvailableReassignmentUplines(
    agentId,
    promotedAgentIds
  );

  const availableUplines =
    uplineData?.data ?? [];

  const filteredUplines =
    availableUplines.filter((upline) => {
      const keyword =
        uplineSearch.trim().toLowerCase();

      const matchesLevel =
        upline.level === "L1";

      const matchesStatus =
        upline.status === "ACTIVE";

      const isNotCurrentAgent =
        upline.id !== agentId;

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
    });

  useEffect(() => {
    if (!selectedAgentDetails) {
      return;
    }

    setAgentForm({
      fullName:
        selectedAgentDetails.fullName,

      username:
        selectedAgentDetails.username ?? "",

      level:
        selectedAgentDetails.level,

      gender:
        selectedAgentDetails.gender ?? "",

      birthDate:
        selectedAgentDetails.birthDate ?? "",

      address:
        selectedAgentDetails.address ?? "",

      email:
        selectedAgentDetails.email ?? "",

      telephone:
        selectedAgentDetails.telephone ?? "",

      secondaryTel:
        selectedAgentDetails.secondaryTel ?? "",
    });
  }, [selectedAgentDetails]);

  useEffect(() => {
    if (!open) {
      setAgentForm(emptyAgentForm);

      setIsUplineModalOpen(false);

      setPendingUpdatePayload(null);

      setNewUplineId("");

      setUplineSearch("");

      setShowUplineOptions(false);
    }
  }, [open]);

  const allowedLevelOptions =
    selectedAgentDetails
      ? getAllowedLevelOptions(
          selectedAgentDetails.level
        )
      : [];

  const handleClose = () => {
    if (isUpdatingAgent) {
      return;
    }

    onClose();
  };

  const handleUpdateAgent = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !agentId ||
      !selectedAgentDetails
    ) {
      return;
    }

    if (!agentForm.fullName.trim()) {
      SweetAlert.errorAlert(
        "Validation Error",
        "Agent full name is required."
      );

      return;
    }

    const payload: UpdateAgentDetailsPayload = {
      fullName:
        agentForm.fullName.trim(),

      username:
        agentForm.username.trim() || null,

      level:
        agentForm.level as UpdateAgentDetailsPayload["level"],

      gender:
        agentForm.gender
          ? (agentForm.gender as UpdateAgentDetailsPayload["gender"])
          : null,

      birthDate:
        agentForm.birthDate || null,

      address:
        agentForm.address.trim() || null,

      email:
        agentForm.email.trim() || null,

      telephone: normalizePHPhone(
        agentForm.telephone
      ),

      secondaryTel: normalizePHPhone(
        agentForm.secondaryTel
      ),

      newUplineId: null,
    };

    const isL3ToL2Promotion =
      selectedAgentDetails.level === "L3" &&
      payload.level === "L2";

    if (isL3ToL2Promotion) {
      setPendingUpdatePayload(payload);

      setNewUplineId("");

      setUplineSearch("");

      setShowUplineOptions(false);

      setIsUplineModalOpen(true);

      return;
    }

    try {
      SweetAlert.loadingAlert(
        "Updating Agent",
        "Please wait..."
      );

      await updateAgent({
        agentId,
        payload,
      });

      Swal.close();

      await SweetAlert.successAlert(
        "Update Successful",
        "Agent information updated successfully."
      );

      onUpdated?.();

      onClose();
    } catch (error: unknown) {
      Swal.close();

      let errorMessage =
        "Unable to update agent information.";

      if (
        axios.isAxiosError<{
          message?: string;
        }>(error)
      ) {
        errorMessage =
          error.response?.data?.message ??
          errorMessage;
      } else if (
        error instanceof Error
      ) {
        errorMessage =
          error.message;
      }

      SweetAlert.errorAlert(
        "Update Failed",
        errorMessage
      );
    }
  };

  const closeUplineModal = () => {
    if (isUpdatingAgent) {
      return;
    }

    setIsUplineModalOpen(false);

    setPendingUpdatePayload(null);

    setNewUplineId("");

    setUplineSearch("");

    setShowUplineOptions(false);
  };

  const handleConfirmL3ToL2Promotion =
    async () => {
      if (
        !agentId ||
        !pendingUpdatePayload
      ) {
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
        SweetAlert.loadingAlert(
          "Updating Agent",
          "Please wait..."
        );

        await updateAgent({
          agentId,

          payload: {
            ...pendingUpdatePayload,
            newUplineId,
          },
        });

        Swal.close();

        await SweetAlert.successAlert(
          "Update Successful",
          "Agent was promoted and assigned to the new upline."
        );

        setIsUplineModalOpen(false);

        setPendingUpdatePayload(null);

        setNewUplineId("");

        setUplineSearch("");

        onUpdated?.();

        onClose();
      } catch (error: unknown) {
        Swal.close();

        let errorMessage =
          "Unable to update agent information.";

        if (
          axios.isAxiosError<{
            message?: string;
          }>(error)
        ) {
          errorMessage =
            error.response?.data?.message ??
            errorMessage;
        } else if (
          error instanceof Error
        ) {
          errorMessage =
            error.message;
        }

        SweetAlert.errorAlert(
          "Update Failed",
          errorMessage
        );
      }
    };

  if (!open) {
    return null;
  }

  return (
    <>
      <MainModal
        size="lg"
        onClose={handleClose}
      >
        <div className="flex flex-col gap-custom-16">
          <div
            className="
              flex
              w-full
              items-start
              justify-start
              rounded-t-xl
              bg-mainPrimary
              px-custom-32
              py-custom-16
            "
          >
            <Image
              src="/images/AMSLOGO.svg"
              alt="JameroGroupOfCompanies"
              width={160}
              height={160}
              priority
            />
          </div>

          <div className="flex flex-col gap-y-custom-8 px-custom-32">
            <h1 className="text-mdHeader font-bold text-mainPrimary">
              Agent Information
            </h1>

            <p className="text-sm text-neutralPrimary">
              Update or configure the selected agent&apos;s information.
            </p>
          </div>

          {isLoadingAgentDetails && (
            <div className="px-custom-32 pb-custom-32">
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
                  Loading agent information...
                </span>
              </div>
            </div>
          )}

          {isAgentDetailsError && (
            <div className="px-custom-32 pb-custom-32">
              <div
                className="
                  rounded-lg
                  bg-red-50
                  px-custom-16
                  py-custom-16
                  text-negative
                "
              >
                Unable to load agent information.
              </div>
            </div>
          )}

          {!isLoadingAgentDetails &&
            selectedAgentDetails && (
              <form
                onSubmit={handleUpdateAgent}
                className="
                  flex
                  max-h-[65vh]
                  flex-col
                  gap-y-custom-20
                  overflow-y-auto
                  px-custom-32
                  pb-custom-32
                "
              >
                <div className="grid grid-cols-1 gap-custom-16 md:grid-cols-2">
                  <div className="flex flex-col gap-y-custom-8">
                    <label
                      htmlFor="agentFullName"
                      className="text-xs font-bold"
                    >
                      Full Name
                    </label>

                    <input
                      id="agentFullName"
                      type="text"
                      value={agentForm.fullName}
                      onChange={(event) =>
                        setAgentForm(
                          (current) => ({
                            ...current,
                            fullName:
                              event.target.value,
                          })
                        )
                      }
                      className="
                        rounded-lg
                        border
                        border-neutralMed
                        bg-neutralLight
                        px-custom-16
                        py-3
                      "
                    />
                  </div>

                  <div className="flex flex-col gap-y-custom-8">
                    <label
                      htmlFor="agentCode"
                      className="text-xs font-bold"
                    >
                      Agent Code
                    </label>

                    <input
                      id="agentCode"
                      type="text"
                      readOnly
                      value={
                        selectedAgentDetails.agentCode
                      }
                      className="
                        cursor-not-allowed
                        rounded-lg
                        border
                        border-neutralMed
                        bg-gray-100
                        px-custom-16
                        py-3
                        opacity-70
                      "
                    />
                  </div>

                  {agentForm.level !== "L3" && (
                    <div className="flex flex-col gap-y-custom-8">
                      <label
                        htmlFor="agentUsername"
                        className="text-xs font-bold"
                      >
                        Username
                      </label>

                      <input
                        id="agentUsername"
                        type="text"
                        value={agentForm.username}
                        onChange={(event) =>
                          setAgentForm(
                            (current) => ({
                              ...current,
                              username:
                                event.target.value,
                            })
                          )
                        }
                        className="
                          rounded-lg
                          border
                          border-neutralMed
                          bg-neutralLight
                          px-custom-16
                          py-3
                        "
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-y-custom-8">
                    <label
                      htmlFor="agentLevel"
                      className="text-xs font-bold"
                    >
                      Level
                    </label>

                    <select
                      id="agentLevel"
                      value={agentForm.level}
                      onChange={(event) =>
                        setAgentForm(
                          (current) => ({
                            ...current,
                            level:
                              event.target.value,
                          })
                        )
                      }
                      className="
                        rounded-lg
                        border
                        border-neutralMed
                        bg-neutralLight
                        px-custom-16
                        py-3
                      "
                    >
                      {allowedLevelOptions.map(
                        (level) => (
                          <option
                            key={level}
                            value={level}
                          >
                            {level}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="flex flex-col gap-y-custom-8">
                    <label
                      htmlFor="agentGender"
                      className="text-xs font-bold"
                    >
                      Gender
                    </label>

                    <select
                      id="agentGender"
                      value={agentForm.gender}
                      onChange={(event) =>
                        setAgentForm(
                          (current) => ({
                            ...current,
                            gender:
                              event.target.value,
                          })
                        )
                      }
                      className="
                        rounded-lg
                        border
                        border-neutralMed
                        bg-neutralLight
                        px-custom-16
                        py-3
                      "
                    >
                      <option value="">
                        Select gender
                      </option>

                      <option value="MALE">
                        Male
                      </option>

                      <option value="FEMALE">
                        Female
                      </option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-y-custom-8">
                    <label
                      htmlFor="agentBirthDate"
                      className="text-xs font-bold"
                    >
                      Birth Date
                    </label>

                    <input
                      id="agentBirthDate"
                      type="date"
                      value={
                        agentForm.birthDate
                      }
                      onChange={(event) =>
                        setAgentForm(
                          (current) => ({
                            ...current,
                            birthDate:
                              event.target.value,
                          })
                        )
                      }
                      className="
                        rounded-lg
                        border
                        border-neutralMed
                        bg-neutralLight
                        px-custom-16
                        py-3
                      "
                    />
                  </div>

                  <div className="flex flex-col gap-y-custom-8">
                    <label
                      htmlFor="agentEmail"
                      className="text-xs font-bold"
                    >
                      Email
                    </label>

                    <input
                      id="agentEmail"
                      type="email"
                      value={agentForm.email}
                      onChange={(event) =>
                        setAgentForm(
                          (current) => ({
                            ...current,
                            email:
                              event.target.value,
                          })
                        )
                      }
                      className="
                        rounded-lg
                        border
                        border-neutralMed
                        bg-neutralLight
                        px-custom-16
                        py-3
                      "
                    />
                  </div>

                  <div className="flex flex-col gap-y-custom-8">
                    <label
                      htmlFor="agentTelephone"
                      className="text-xs font-bold"
                    >
                      Primary Telephone
                    </label>

                    <div
                      className="
                        flex
                        items-center
                        overflow-hidden
                        rounded-lg
                        border
                        border-neutralMed
                        focus-within:border-mainPrimary
                      "
                    >
                      <span
                        className="
                          select-none
                          border-r
                          border-neutralMed
                          bg-neutralLight
                          px-4
                          py-3
                          font-semibold
                          text-neutralPrimary
                        "
                      >
                        +63
                      </span>

                      <input
                        id="agentTelephone"
                        type="tel"
                        value={agentForm.telephone?.replace(
                          /^\+63/,
                          ""
                        )}
                        onChange={(event) =>
                          setAgentForm(
                            (current) => ({
                              ...current,
                              telephone:
                                event.target.value,
                            })
                          )
                        }
                        className="
                          flex-1
                          bg-neutralLight
                          px-custom-16
                          py-3
                        "
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-y-custom-8">
                    <label
                      htmlFor="agentSecondaryTel"
                      className="text-xs font-bold"
                    >
                      Secondary Telephone
                    </label>

                    <div
                      className="
                        flex
                        items-center
                        overflow-hidden
                        rounded-lg
                        border
                        border-neutralMed
                        focus-within:border-mainPrimary
                      "
                    >
                      <span
                        className="
                          select-none
                          border-r
                          border-neutralMed
                          bg-neutralLight
                          px-4
                          py-3
                          font-semibold
                          text-neutralPrimary
                        "
                      >
                        +63
                      </span>

                      <input
                        id="agentSecondaryTel"
                        type="tel"
                        value={agentForm.secondaryTel?.replace(
                          /^\+63/,
                          ""
                        )}
                        onChange={(event) =>
                          setAgentForm(
                            (current) => ({
                              ...current,
                              secondaryTel:
                                event.target.value,
                            })
                          )
                        }
                        className="
                          flex-1
                          bg-neutralLight
                          px-custom-16
                          py-3
                        "
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-y-custom-8 md:col-span-2">
                    <label
                      htmlFor="agentAddress"
                      className="text-xs font-bold"
                    >
                      Address
                    </label>

                    <textarea
                      id="agentAddress"
                      rows={3}
                      value={agentForm.address}
                      onChange={(event) =>
                        setAgentForm(
                          (current) => ({
                            ...current,
                            address:
                              event.target.value,
                          })
                        )
                      }
                      className="
                        resize-none
                        rounded-lg
                        border
                        border-neutralMed
                        bg-neutralLight
                        px-custom-16
                        py-3
                      "
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-custom-16 border-t border-neutralMed pt-custom-16">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isUpdatingAgent}
                    className="
                      cursor-pointer
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
                    type="submit"
                    disabled={isUpdatingAgent}
                    className="
                      cursor-pointer
                      rounded-lg
                      bg-mainPrimary
                      px-custom-24
                      py-3
                      font-semibold
                      text-white
                      hover:bg-lightPrimary
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    {isUpdatingAgent
                      ? "Updating Agent..."
                      : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
        </div>
      </MainModal>

      {isUplineModalOpen && (
        <MainModal
          size="md"
          onClose={closeUplineModal}
        >
          <div className="flex flex-col gap-custom-24 p-custom-32">
            <div>
              <h1 className="text-mdHeader font-bold text-mainPrimary">
                Select New Upline
              </h1>

              <p className="mt-2 text-sm text-neutralPrimary">
                This agent is being promoted
                from L3 to L2. Select an active
                L1 agent as the new upline.
              </p>
            </div>

            <div
              ref={uplineDropdownRef}
              className="relative flex flex-col gap-y-custom-8"
            >
              <label
                htmlFor="newUpline"
                className="text-sm font-semibold text-neutralPrimary"
              >
                New L1 Upline
              </label>

              <div className="relative">
                <input
                  id="newUpline"
                  type="text"
                  autoComplete="off"
                  value={uplineSearch}
                  placeholder="Search or select an L1 upline..."
                  onFocus={() =>
                    setShowUplineOptions(true)
                  }
                  onClick={() =>
                    setShowUplineOptions(true)
                  }
                  onChange={(event) => {
                    setUplineSearch(
                      event.target.value
                    );

                    setNewUplineId("");

                    setShowUplineOptions(true);
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
                      setUplineSearch("");

                      setNewUplineId("");

                      setShowUplineOptions(true);
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
                    "
                  >
                    ×
                  </button>
                )}
              </div>

              {newUplineId && (
                <p className="text-xs font-semibold text-positive">
                  Upline selected
                </p>
              )}

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
                    <div className="px-4 py-3 text-sm text-slate-500">
                      Loading uplines...
                    </div>
                  ) : isUplineError ? (
                    <div className="px-4 py-3 text-sm text-negative">
                      Unable to load eligible
                      uplines.
                    </div>
                  ) : filteredUplines.length ===
                    0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      No active L1 uplines
                      found.
                    </div>
                  ) : (
                    filteredUplines.map(
                      (upline) => (
                        <button
                          key={upline.id}
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
                            hover:bg-slate-50
                          "
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-neutralPrimary">
                              {upline.fullName}
                            </span>

                            <span className="text-xs text-slate-500">
                              {upline.agentCode}
                              {" • "}
                              {upline.level}
                              {" • "}
                              {upline.status}
                            </span>
                          </div>
                        </button>
                      )
                    )
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-custom-16 border-t border-neutralMed pt-custom-16">
              <button
                type="button"
                disabled={isUpdatingAgent}
                onClick={closeUplineModal}
                className="
                  rounded-lg
                  border
                  border-neutralMed
                  px-custom-24
                  py-3
                  font-semibold
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
                  isUpdatingAgent ||
                  !newUplineId
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
                  hover:bg-lightPrimary
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {isUpdatingAgent
                  ? "Updating..."
                  : "Confirm Promotion"}
              </button>
            </div>
          </div>
        </MainModal>
      )}
    </>
  );
}