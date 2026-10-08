"use client";

import AppsTab from "@/components/ui/commonUi/general.tab";
import ModuleHeader from "@/components/ui/commonUi/page.header";
import PersonalDetailsStep from "./step/PersonalDetailsStep";

import { useState } from "react";

import {
  UserPlus,
  Clock3,
  UserRound,
  GitBranch,
  ClipboardCheck,
} from "lucide-react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useForm,
  useWatch,
} from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  registrationAgentSchema,
  RegisterAgentSchema,
} from "@repo/shared";
import LevelBranchStep from "./step/LevelBranchStep";
import FinalAssessmentStep from "./step/FinalAssessmentStep";
import PendingRegistration from "./tabs/PendingReg";



type TABKEY =
  | "registration"
  | "pending-registration";

type REGISTRATION_STEP =
  | "personal-details"
  | "level-branch"
  | "final-assessment";



export default function DashboardPage() {

  const router = useRouter();

  const searchParams =
    useSearchParams();

  const initialTab =
    (searchParams.get(
      "tab"
    ) as TABKEY) ??
    "registration";



  const [activeTab, setActiveTab] =
    useState<TABKEY>(
      initialTab
    );

  const [activeStep, setActiveStep] =
    useState<REGISTRATION_STEP>(
      "personal-details"
    );

  const [highestStep, setHighestStep] =
    useState<REGISTRATION_STEP>(
      "personal-details"
    );

    const stepOrder: REGISTRATION_STEP[] = [
      "personal-details",
      "level-branch",
      "final-assessment",
    ];

    const canNavigateToStep = (
      step: REGISTRATION_STEP
    ) => {
      return (
        stepOrder.indexOf(step) <=
        stepOrder.indexOf(highestStep)
      );
    };


    const isPreviousStep = (
      step: REGISTRATION_STEP
    ) => {
      return (
        stepOrder.indexOf(step) <
        stepOrder.indexOf(activeStep)
      );
    };

  /* =========================================
     REACT HOOK FORM
  ========================================= */

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    control,
    setValue,
    getValues,
    reset,
  } =
  useForm<RegisterAgentSchema>({
      resolver:
        zodResolver(
          registrationAgentSchema
        ),

      defaultValues: {
        email: "",
        agentName: "",
        agentGender: "",
        parentAgentId: "",
        parentAgentName: "",
        uplineLevel: "",
        branches: [],

        dateBirth: undefined,

        agentTel: "",
        agentSecTel: "",
        branchCode: "",
        agentQrCode: "",
        username: "",
        agentAdd: "",
        selectedAgentLevel: "",
      },
    });

  const watchedValues: Partial<RegisterAgentSchema> =
  useWatch({
    control,
  });


  const handleRegistrationSuccess =
  () => {
    /*
     * Clear every React Hook Form field.
     */
    reset({
      email: "",
      agentName: "",
      agentGender: "",
      parentAgentId: "",
      parentAgentName: "",
      uplineLevel: "",
      branches: [],

      dateBirth:
        undefined,

      agentTel: "",
      agentSecTel: "",

      branchCode: "",
      agentQrCode: "",
      username: "",
      agentAdd: "",
      selectedAgentLevel: "",
    });

    /*
     * Return wizard navigation back
     * to step 1.
     */
    setActiveStep(
      "personal-details"
    );

    /*
     * Prevent the user from clicking
     * directly back to steps 2 or 3.
     */
    setHighestStep(
      "personal-details"
    );
  };
  /* =========================================
     TABS
  ========================================= */

  const TABS: {
    key: TABKEY;
    label: string;
    icon: React.ElementType;
  }[] = [
    {
      key: "registration",
      label: "Registration",
      icon: UserPlus,
    },
    {
      key: "pending-registration",
      label:
        "Pending Registrations",
      icon: Clock3,
    },
 
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



  return (
    <div className="w-full flex flex-col gap-y-custom-32 px-custom-32 py-custom-48">

      <ModuleHeader
        title="Agent"
        subtitle="Registration"
      />

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

      {/* REGISTRATION */}
      {activeTab ===
        "registration" && (

        <div className="flex flex-col gap-custom-32">

          {/* STEP TABS */}
          <ul className="w-full flex justify-between items-center border-y border-y-neutralMed">

                          {/* PERSONAL DETAILS */}
            <li
              onClick={() => {
                if (
                  canNavigateToStep(
                    "personal-details"
                  )
                ) {
                  setActiveStep(
                    "personal-details"
                  );
                }
              }}
              className={`
                inline-flex
                py-custom-16
                gap-custom-16
                items-center
                justify-center
                w-full
                transition-all

                ${
                  canNavigateToStep(
                    "personal-details"
                  )
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-50"
                }

                ${
                  activeStep ===
                  "personal-details"

                    ? "border-b-2 border-positive text-positive font-semibold"

                    : isPreviousStep(
                        "personal-details"
                      )

                    ? "text-positive"

                    : "text-neutralPrimary"
                }
              `}
            >
              <UserRound />

              Personal Details
            </li>

            {/* LEVEL & BRANCH */}
            <li
              onClick={() => {
                if (
                  canNavigateToStep(
                    "level-branch"
                  )
                ) {
                  setActiveStep(
                    "level-branch"
                  );
                }
              }}
              className={`
                inline-flex
                gap-x-custom-16
                py-custom-16
                items-center
                justify-center
                w-full
                border-x
                border-x-neutralMed
                transition-all

                ${
                  canNavigateToStep(
                    "level-branch"
                  )
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-50"
                }

                ${
                  activeStep ===
                  "level-branch"

                    ? "border-b-2 border-positive text-positive font-semibold"

                    : isPreviousStep(
                        "level-branch"
                      )

                    ? "text-positive"

                    : "text-neutralPrimary"
                }
              `}
            >
              <GitBranch />

              Level & Branch Assignment
            </li>

            {/* FINAL ASSESSMENT */}
            <li
              onClick={() => {
                if (
                  canNavigateToStep(
                    "final-assessment"
                  )
                ) {
                  setActiveStep(
                    "final-assessment"
                  );
                }
              }}
              className={`
                inline-flex
                py-custom-16
                gap-x-custom-16
                items-center
                justify-center
                w-full
                transition-all

                ${
                  canNavigateToStep(
                    "final-assessment"
                  )
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-50"
                }

                ${
                  activeStep ===
                  "final-assessment"

                    ? "border-b-2 border-positive text-positive font-semibold"

                    : isPreviousStep(
                        "final-assessment"
                      )

                    ? "text-positive"

                    : "text-neutralPrimary"
                }
              `}
            >
              <ClipboardCheck />

              Final Assessment
            </li>

            </ul>

          {/* =========================================
              STEP 1
          ========================================= */}

          {activeStep ===
            "personal-details" && (

            <PersonalDetailsStep
              register={register}
              errors={errors}
              trigger={trigger}
              getValues={getValues}
              setHighestStep={
                setHighestStep
              }
              setActiveStep={
                setActiveStep
              }
            />
          )}


          {/* =========================================
              STEP 2
          ========================================= */}

          {activeStep ===
            "level-branch" && (

            <LevelBranchStep
              control={control}
              trigger={trigger}
              setValue={setValue}
              errors={errors}
              setHighestStep={setHighestStep}
              setActiveStep={setActiveStep}
            />
          )}

       {/* =========================================
            STEP 3
        ========================================= */}

        {activeStep ===
          "final-assessment" && (

          <FinalAssessmentStep
            watchedValues={
              watchedValues
            }
            handleSubmit={
              handleSubmit
            }
            onRegistrationSuccess={
              handleRegistrationSuccess
            }
     
          />
        )}

        </div>
      )}


      {activeTab === "pending-registration" &&(
        <PendingRegistration/>
      )}

    </div>
  );
}