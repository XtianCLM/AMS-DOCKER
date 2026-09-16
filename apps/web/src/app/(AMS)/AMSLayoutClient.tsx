"use client";

import { useEffect, useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import Image from "next/image";

import Sidebar from "@/components/sidebarComp/sidebar";
import { useAuth } from "@/components/context/UserContext";

import {
  Building2,
  Coins,
  Factory,
  Settings,
  User2,
  User2Icon,
} from "lucide-react";

import SweetAlert from "@/components/modal/Swal";
import { getErrorMessage } from "@/components/helper/errorHelper";

import { useDebounce } from "use-debounce";

import MainModal from "@/components/modal/mainModal";

import {
  useForm,
  useWatch,
} from "react-hook-form";

import {
  AgentSearchResult,
  createUserSchema,
  RegisterSchema,
  updateAdminAccSchema,
  UpdateAdminAccSchema,
} from "@repo/shared";

import { zodResolver } from "@hookform/resolvers/zod";

import { useCreateUser } from "@/hooks/user/useCreateUser";

import { toast } from "sonner";
import { AxiosError } from "axios";

import OverrideRules from "./Settings/OverrideRules";

import {
  useBranchesSetting,
  useCommissionSettings,
  useCompanySetting,
  useMasterlistUsers,
  useRoles,
} from "@/hooks/general/useGeneral";

import ExpiredRules from "./Settings/ExpiredRules";
import CodedRules from "./Settings/CodedRules";
import ActiveUsers from "./Settings/ActiveUser";
import InactiveUsers from "./Settings/InactiveUser";

import PermissionGuard from "@/components/guard/PermissionGuard";
import Can from "@/components/guard/PermissionHide";
import PermissionsTab from "@/components/guard/PermissionsTab";
import BranchSelect from "@/components/ui/BranchSelect";

import { useSubmitReactivationRequest } from "@/hooks/reactivation/useReactivation";

import {
  useSearchAgentsReactivate,
  useUpdateAdminAccount,
} from "@/hooks/agents/useAgent";

import BranchSettings from "./Settings/Branches";
import CompanySettings from "./Settings/Companies";

enum SettingsTab {
  User = "user",
  COMMISSION = "commission",
  BRANCH_SETTINGS = "branch-settings",
  COMPANY = "companies",
  NOTIFICATIONS = "notifications",
}

export default function AMSLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    user,
    loading,
    logout,
    refreshUser,
  } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [
    loading,
    user,
    router,
  ]);

  const userSearch =
    searchParams.get("userSearch") || "";

  const branchSearch =
    searchParams.get("branchSearch") || "";

  const companySearch =
    searchParams.get("companySearch") || "";

  const [
    searchText,
    setSearchText,
  ] = useState(userSearch);

  const [
    branchText,
    setBranchText,
  ] = useState(branchSearch);

  const [
    companyText,
    setCompanyText,
  ] = useState(companySearch);

  const [
    debouncedUserSearch,
  ] = useDebounce(
    searchText,
    500
  );

  const [
    debouncedBranchSearch,
  ] = useDebounce(
    branchText,
    500
  );

  const [
    debouncedCompanySearch,
  ] = useDebounce(
    companyText,
    500
  );

  const page =
    Number(
      searchParams.get("page")
    ) || 1;

  const createUserMutation =
    useCreateUser();

  const [
    openSidebar,
    setOpenSidebar,
  ] = useState(true);

  const [
    register,
    setRegister,
  ] = useState(false);

  const [
    settings,
    setSettings,
  ] = useState(false);

  const [
    agentUpdate,
    setAgentUpdate,
  ] = useState(false);

  const [
    openProfile,
    setOpenProfile,
  ] = useState(false);

  const [
    openPermission,
    setOpenPermission,
  ] = useState(false);

  const [
    openAdminReactivation,
    setOpenAdminReactivation,
  ] = useState(false);

  const [
    formalRequestFile,
    setFormalRequestFile,
  ] = useState<File | null>(
    null
  );

  const [
    searchAgent,
    setSearchAgent,
  ] = useState("");

  const [
    selectedAgent,
    setSelectedAgent,
  ] =
    useState<AgentSearchResult | null>(
      null
    );

  const [
    isAddBranchOpen,
    setIsAddBranchOpen,
  ] = useState(false);

  const [
    isAddCompanyOpen,
    setIsAddCompanyOpen,
  ] = useState(false);

  const [
    showDropdown,
    setShowDropdown,
  ] = useState(false);

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<SettingsTab>(
      SettingsTab.User
    );

  const [
    commissionTab,
    setCommissionTab,
  ] = useState<
    "coded" | "expired" | "override"
  >("coded");

  const [
    userTab,
    setUserTab,
  ] = useState<
    "active" | "inactive"
  >("active");

  const {
    mutateAsync:
      submitAdminRequest,
    isPending:
      isSubmittingAdminRequest,
  } =
    useSubmitReactivationRequest();

  const {
    data,
  } =
    useCommissionSettings();

  const {
    data: userList,
  } =
    useMasterlistUsers({
      page,
      search: userSearch,
      status: userTab,
    });

  const {
    data: branchList,
  } =
    useBranchesSetting({
      page,
      search: branchSearch,
    });

  const {
    data: companyList,
  } =
    useCompanySetting({
      page,
      search: companySearch,
    });

  const {
    data: agents = [],
  } =
    useSearchAgentsReactivate({
      search: searchAgent,
    });

  const {
    data: roles = [],
    isLoading:
      isRolesLoading,
  } = useRoles();

  const form =
    useForm<RegisterSchema>({
      resolver:
        zodResolver(
          createUserSchema
        ),

      defaultValues: {
        email: "",
        name: "",
        username: "",
        password: "",
        roleIds: [],
        branchCode: "",
      },
    });

  const onSubmit = (
    data: RegisterSchema
  ) => {
    createUserMutation.mutate(
      data,
      {
        onSuccess: () => {
          toast.success(
            "User created successfully"
          );

          form.reset();
        },

        onError: (
          error
        ) => {
          const axiosError =
            error as AxiosError<{
              message: string;
            }>;

          toast.error(
            axiosError
              .response
              ?.data
              ?.message ??
              "Something went wrong"
          );
        },
      }
    );
  };

  const selectedRoleIds =
    form.watch("roleIds") ??
    [];

  const selectedRole =
    roles.find(
      (role) =>
        selectedRoleIds.includes(
          role.id
        )
    );

  const shouldShowBranchSelect =
    selectedRole?.name ===
    "BRANCH_ACC";

  useEffect(() => {
    if (
      debouncedUserSearch ===
      userSearch
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    if (
      debouncedUserSearch.trim()
    ) {
      params.set(
        "userSearch",
        debouncedUserSearch.trim()
      );
    } else {
      params.delete(
        "userSearch"
      );
    }

    params.set(
      "page",
      "1"
    );

    router.replace(
      `?${params.toString()}`,
      {
        scroll: false,
      }
    );
  }, [
    debouncedUserSearch,
    userSearch,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (
      debouncedBranchSearch ===
      branchSearch
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    if (
      debouncedBranchSearch.trim()
    ) {
      params.set(
        "branchSearch",
        debouncedBranchSearch.trim()
      );
    } else {
      params.delete(
        "branchSearch"
      );
    }

    params.set(
      "page",
      "1"
    );

    router.replace(
      `?${params.toString()}`,
      {
        scroll: false,
      }
    );
  }, [
    debouncedBranchSearch,
    branchSearch,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (
      debouncedCompanySearch ===
      companySearch
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    if (
      debouncedCompanySearch.trim()
    ) {
      params.set(
        "companySearch",
        debouncedCompanySearch.trim()
      );
    } else {
      params.delete(
        "companySearch"
      );
    }

    params.set(
      "page",
      "1"
    );

    router.replace(
      `?${params.toString()}`,
      {
        scroll: false,
      }
    );
  }, [
    debouncedCompanySearch,
    companySearch,
    router,
    searchParams,
  ]);

  const {
    mutateAsync:
      updateAdminAccount,
  } =
    useUpdateAdminAccount();

  const editform =
    useForm<UpdateAdminAccSchema>(
      {
        resolver:
          zodResolver(
            updateAdminAccSchema
          ),

        defaultValues: {
          email: "",
          password: "",
        },
      }
    );

  const onSubmitEdit =
    async (
      data: UpdateAdminAccSchema
    ) => {
      try {
        await updateAdminAccount(
          data
        );

        await refreshUser();

        editform.reset({
          email:
            data.email ??
            "",

          password: "",
          confirmPassword:
            "",
        });

        SweetAlert.successAlert(
          "Success",
          "Account updated successfully."
        );

        handleCloseAgentUpdate();
      } catch {
        SweetAlert.errorAlert(
          "Error",
          "Failed to update account."
        );
      }
    };

  useEffect(() => {
    if (
      agentUpdate &&
      user
    ) {
      editform.reset({
        email:
          user.email ??
          "",
        password: "",
        confirmPassword:
          "",
      });
    }
  }, [
    agentUpdate,
    user,
    editform,
  ]);

  const {
    formState: {
      isDirty,
      isSubmitting,
    },
  } = editform;

  const password =
    useWatch({
      control:
        editform.control,
      name: "password",
    });

  const handleUserTabChange =
    (
      tab:
        | "active"
        | "inactive"
    ) => {
      setUserTab(tab);

      const params =
        new URLSearchParams(
          searchParams.toString()
        );

      params.set(
        "page",
        "1"
      );

      router.replace(
        `?${params.toString()}`
      );
    };

  const handleCloseAdminReactivation =
    async () => {
      setFormalRequestFile(
        null
      );

      setOpenAdminReactivation(
        false
      );
    };

  const handleAdminReactivationSubmit =
    async () => {
      if (
        !selectedAgent?.agentCode
      ) {
        await SweetAlert.errorAlert(
          "Agent Required",
          "Please select the expired agent requesting reactivation."
        );

        return;
      }

      if (
        !formalRequestFile
      ) {
        await SweetAlert.errorAlert(
          "File Required",
          "Please upload the formal written reactivation request."
        );

        return;
      }

      const formData =
        new FormData();

      formData.append(
        "agentCode",
        selectedAgent.agentCode
      );

      formData.append(
        "formalRequestFile",
        formalRequestFile
      );

      try {
        await submitAdminRequest(
          formData
        );

        await SweetAlert.successAlert(
          "Request Submitted",
          `${selectedAgent.fullName}'s reactivation request was submitted successfully.`
        );

        setFormalRequestFile(
          null
        );

        setSelectedAgent(
          null
        );

        setSearchAgent("");

        setShowDropdown(
          false
        );

        setOpenAdminReactivation(
          false
        );
      } catch (error) {
        await SweetAlert.errorAlert(
          "Submission Failed",
          getErrorMessage(
            error
          )
        );
      }
    };

  const handleOpenPermission =
    () => {
      setOpenPermission(
        true
      );
    };

  const handleClosePermission =
    () => {
      setOpenPermission(
        false
      );
    };

  const handleLogout =
    () => {
      SweetAlert.confirmationAlert(
        "Sign Out",
        "Are you sure you want to sign out?",
        async () => {
          try {
            await logout();
          } catch (
            error
          ) {
            SweetAlert.errorAlert(
              "Account Signing Out Failed",
              getErrorMessage(
                error
              )
            );
          }
        }
      );
    };

  const handleCloseRegistration =
    () => {
      setRegister(false);
      form.reset();
    };

  const handleCloseSetting =
    () => {
      setSettings(false);
    };

  const handleCloseAgentUpdate =
    () => {
      if (
        !editform
          .formState
          .isDirty
      ) {
        setAgentUpdate(
          false
        );
        return;
      }

      SweetAlert.confirmationAlert(
        "Discard Changes?",
        "Any unsaved changes will be lost.",
        () => {
          editform.reset({
            email:
              user?.email ??
              "",
            password: "",
            confirmPassword:
              "",
          });

          setAgentUpdate(
            false
          );
        }
      );
    };

  if (loading) {
    return (
      <div
        className="
          min-h-screen
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
            Checking account...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  /*
   * ==========================
   * YOUR EXISTING JSX STARTS
   * ==========================
   *
   * From here onward, paste the return (...) from your
   * existing layout EXACTLY as it currently is.
   *
   * Nothing inside that JSX needs to change for Suspense.
   */

  return (
    <PermissionGuard permission="DASHBOARD_ACCESS">
      <div className="flex flex-col h-screen overflow-hidden bg-white">
        {/* HEADER */}

        <header
          className="
            h-custom-64
            shrink-0
            bg-mainPrimary
            shadow-md
            flex
            items-center
            px-custom-24
            z-60
            justify-between
          "
        >
          <Image
            src="/images/AMSLOGO.svg"
            alt="JameroGroupOfCompanies"
            width={160}
            height={160}
            priority
          />

          <div className="flex gap-custom-24">

              <Can permission="ADMIN_MANAGE">
                  {/* <button
                  onClick={() => {
                    setOpenAdminReactivation(true);
                  }}
                  className="
                    relative
                    flex
                    items-center
                    rounded-full
                    text-white
                    cursor-pointer
                    hover:scale-105
                    duration-150
                    ease-in-out
                  "
                >
                  <BellDot size={22} />
                </button> */}
                <button onClick={() => {
                  setSettings(true);
                }} className=" flex items-center rounded-full text-white cursor-pointer hover:scale-105 duration-150 ease-in-out">
                  <Settings size={22} />
                </button>
              </Can>

              <div
                onClick={() =>
                  setOpenProfile(true)
                }
                className="
                  relative
                  flex
                  items-center
                  justify-center
                  gap-custom-16
                  text-white
                  bg-lightPrimary
                  p-custom-8
                  sm:py-custom-8
                  sm:px-custom-16
                  rounded-lg
                  cursor-pointer
                  hover:scale-103
                  ease-in-out
                  duration-150
                "
              >
                <div
                  className="
                    border
                    border-white
                    p-1
                    rounded-full
                  "
                >
                  <User2 size={12} />
                </div>
                <p
                  className="
                    text-body
                    hidden
                    sm:flex
                  "
                >
                  {user.username}
                </p>
              </div>
            </div>
          
          {openProfile && (
            <div
              onClick={() =>
                setOpenProfile(false)
              }
              className="
                        fixed
                        inset-0
                        z-999
                        bg-black/40
                        backdrop-blur-[2px]
                        flex
                        justify-end
                      "
            >
              <div
                onClick={(e) =>
                  e.stopPropagation()
                }
                className="
                          w-full
                          sm:w-100
                          sm:h-screen
                          h-fit
                          bg-white
                          shadow-2xl
                          flex
                          flex-col
                          animate-in
                          sm:slide-in-from-right
                          fade-in-5
                          duration-300
                          p-custom-24
                          max-h-screen
                          overflow-y-auto
                          sm:m-0
                          mx-custom-32
                          my-custom-48
                          sm:rounded-none
                          rounded-lg
                          text-mainPrimary
                        "
              >
                {/* HEADER */}
                <div
                  className="
                            flex
                            items-center
                            justify-between
                            border-b
                            border-neutralMed
                            pb-custom-16
                          "
                >
                  <h1
                    className="
                              text-mdHeader
                              font-bold
                            "
                  >
                    {user.roles}
                  </h1>
                  <button
                    onClick={() =>
                      setOpenProfile(false)
                    }
                    className="
                              w-8
                              h-8
                              rounded-full
                              bg-neutralLight
                              hover:bg-neutralMed
                              flex
                              items-center
                              justify-center
                            "
                  >
                    ✕
                  </button>
                </div>
                <div
                  className="
                            my-custom-24
                            flex
                            flex-col
                            gap-custom-16
                          "
                >
                  <div
                    className="
                                bg-neutralLight
                                p-custom-16
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
                      Username
                    </h2>
                    <p
                      className="
                                  font-bold
                                  text-sm
                                "
                    >
                      {user.username}
                    </p>
                  </div>
                  {/* <div
                    className="
                              bg-neutralLight
                              p-custom-16
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
                      Telephone
                    </h2>
                    <p className="font-bold text-sm">
                      09123456273
                    </p>
                  </div> */}
                  <div
                    className="
                              bg-neutralLight
                              p-custom-16
                              rounded-xl
                            "
                  >
                    <h2
                      className="
                                text-xs
                                text-neutralPrimary
                              "
                    >
                      Email Address
                    </h2>
                    <p className="font-bold text-sm">
                      {user?.email}
                    </p>
                  </div>
                  <div className="flex w-full justify-start items-center gap-custom-8 text-white">
                  
                     <Can permission="USER_MANAGE">
                       <button onClick={() => {
                          setRegister(true)
                                            }} className="w-full text-sm bg-positive font-bold text-white
                                    py-custom-8 px-custom-16 rounded-lg cursor-pointer hover:scale-105 ease-in-out duration-150">
                          Register Account
                        </button>
                     </Can>
                      
                        <Can permission="BRANCH_VIEW">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenAdminReactivation(true)
                            }
                            className="
                              w-full
                              text-white
                              bg-mainPrimary
                              px-custom-16 py-custom-8
                              text-sm
                              rounded-lg
                              font-bold
                              cursor-pointer
                              hover:bg-lightPrimary
                              ease-in-out
                              duration-150
                            "
                          >
                            Reactivate Agent
                          </button>
                        </Can>
      
                  </div>
                            
                    <button onClick={()=>{
                        setAgentUpdate(true);
                      }}
                    className="w-full text-sm text-white bg-secondary font-bold
                               py-custom-8 px-custom-16 rounded-lg cursor-pointer hover:scale-105 ease-in-out duration-150">
                      Edit Profile
                    </button>
                  
                  <Can permission="ADMIN_MANAGE">
                      <button onClick={handleOpenPermission} className="w-full font-bold text-white text-sm bg-lightPrimary py-custom-8 px-custom-16 rounded-lg cursor-pointer hover:scale-105 ease-in-out duration-150">
                        Permission Management
                      </button>
                  </Can>
                 

                  <button onClick={handleLogout} className="w-full font-bold text-white text-sm bg-neutralPrimary py-custom-8 px-custom-16 rounded-lg cursor-pointer hover:scale-105 ease-in-out duration-150">
                      Sign Out
                  </button>
      
                </div>
              </div>
            </div>
          )}

        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside
            className={`
              bg-neutralLight
              transition-all duration-300
              ${
                openSidebar
                  ? "w-64"
                  : "w-20"
              }
              shrink-0
              border-r
              border-neutralLight
              shadow-md
            `}
          >
            <Sidebar
              isOpen={
                openSidebar
              }
              onToggle={() =>
                setOpenSidebar(
                  (prev) =>
                    !prev
                )
              }
            />
          </aside>

          <main className="flex-1 overflow-y-auto p-custom-8 bg-white">
            {children}
          </main>
        </div>
  {register && (
          <MainModal size="md" onClose={handleCloseRegistration}>
            <div
              className="
                  flex
                  flex-col
                  gap-custom-16
                "
            >
              <div className="w-full flex items-start justify-start bg-mainPrimary py-custom-16 px-custom-32 rounded-t-xl">
                <Image
                  src="/images/AMSLOGO.svg"
                  alt="JameroGroupOfCompanies"
                  width={160}
                  height={160}
                  priority
                />
              </div>
              <div className="px-custom-32 flex flex-col gap-y-custom-8">
                <h1 className="text-mdHeader font-bold text-mainPrimary">Registration Form</h1>
                <p>Create a New Branch or Administration Account</p>
              </div>
              <form
                onSubmit={form.handleSubmit(
                  onSubmit
                )}
                className="flex flex-col gap-y-custom-16 w-full px-custom-32 pb-custom-32"
              >
                <div className="flex flex-col gap-y-custom-16 max-h-70 overflow-y-auto py-custom-8">
                    <div className="flex flex-col gap-y-custom-8">
                      <label className="font-bold text-xs">
                        Role
                      </label>
                      <select
                      className="bg-neutralLight border border-neutralMed py-3 px-custom-16 rounded-lg"
                      value={form.watch("roleIds")?.[0] ?? ""}
                      onChange={(e) => {
                        const value = Number(e.target.value);

                        form.setValue("roleIds", value ? [value] : [], {
                          shouldValidate: true,
                          shouldDirty: true,
                        });

                        form.setValue("branchCode", undefined);
                      }}
                      >
                        <option value="">
                          {isRolesLoading ? "Loading roles..." : "Select role"}
                        </option>

                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>

                  {shouldShowBranchSelect && (
                    <div className="flex flex-col gap-y-custom-8">
                      <label className="font-bold text-xs">
                        Branch
                      </label>
                      <BranchSelect
                        value={form.watch("branchCode")}
                        onChange={(branch) => {
                          form.setValue("branchCode", branch.branchCode);

                          // Automatically use company name as username
                          form.setValue(
                            "username",
                            branch.companyName
                          );
                        }}
                      />
                    </div>
                  )}

                  <div className="flex gap-custom-16 w-full">
                    <div className="flex flex-col gap-y-custom-8 w-full">
                      <label htmlFor="name" className="font-bold text-xs">Username</label>
                      <input
                        className="bg-neutralLight border border-neutralMed py-3 px-custom-16 rounded-lg"
                        readOnly={shouldShowBranchSelect}
                        placeholder="Username"
                        {...form.register(
                          "username"
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-y-custom-8 w-full">
                      <label htmlFor="name" className="font-bold text-xs">Password</label>
                      <input
                        className="bg-neutralLight border border-neutralMed py-3 px-custom-16 rounded-lg"
                        type="password"
                        placeholder="Password"
                        {...form.register(
                          "password"
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-y-custom-8">
                    <label htmlFor="name" className="font-bold text-xs">Email Address</label>
                    <input
                      className="bg-neutralLight border border-neutralMed py-3 px-custom-16 rounded-lg"
                      placeholder="Email"
                      {...form.register("email")}
                    />
                  </div>

                  <div className="flex flex-col gap-y-custom-8">
                    <label htmlFor="name" className="font-bold text-xs">Fullname</label>
                    <input
                      id="name"
                      className="bg-neutralLight border border-neutralMed py-3 px-custom-16 rounded-lg"
                      placeholder="Name"
                      {...form.register("name")}
                    />
                  </div>


                </div>
                <button
                  type="submit"
                  className="text-white p-3 rounded-lg text-body font-bold bg-mainPrimary cursor-pointer hover:bg-lightPrimary ease-in-out duration-150"
                  disabled={
                    createUserMutation.isPending
                  }
                >
                  {createUserMutation.isPending
                    ? "Registering new user..."
                    : "Register New User "}
                </button>
              </form>
            </div>
          </MainModal>
        )}

        {settings && (
          <MainModal size="xxl" onClose={handleCloseSetting}>
            <div className="
                  flex
                  flex-col
                  gap-custom-16
                "
            >
              <div className="w-full flex items-start justify-start bg-mainPrimary py-custom-16 px-custom-32 rounded-t-xl">
                <Image
                  src="/images/AMSLOGO.svg"
                  alt="JameroGroupOfCompanies"
                  width={160}
                  height={160}
                  priority
                />
              </div>
              <div className="grid grid-cols-3 min-h-115">
                {/* SIDEBAR */}
                <ul
                  className="
                      border-r
                      border-neutralPrimary
                      px-custom-24
                      py-custom-16
                      flex
                      flex-col
                      gap-y-custom-16
                    "
                >
                  <li
                    onClick={() => setActiveTab(SettingsTab.User)}
                    className={`
                        flex
                        gap-custom-16
                        items-center
                        rounded-lg
                        px-custom-16
                        py-custom-8
                        cursor-pointer
                        transition-all
                        duration-150
                        ${activeTab === "user"
                        ? "bg-mainPrimary text-white shadow-md"
                        : "text-neutralPrimary hover:bg-neutralLight"
                      }
                      `}
                  >
                    <User2Icon size={18} />
                    <span>Users</span>
                  </li>

                   <li
                    onClick={() => setActiveTab(SettingsTab.BRANCH_SETTINGS)}
                    className={`
                        flex
                        gap-custom-16
                        items-center
                        rounded-lg
                        px-custom-16
                        py-custom-8
                        cursor-pointer
                        ${activeTab === SettingsTab.BRANCH_SETTINGS
                        ? "bg-mainPrimary text-white"
                        : "text-neutralPrimary hover:bg-neutralLight"
                      }
                      `}
                  >
                    <Building2 size={18} />
                    <span>Branches</span>
                  </li>

                  <li
                    onClick={() => setActiveTab(SettingsTab.COMPANY)}
                    className={`
                        flex
                        gap-custom-16
                        items-center
                        rounded-lg
                        px-custom-16
                        py-custom-8
                        cursor-pointer
                        ${activeTab === SettingsTab.COMPANY
                        ? "bg-mainPrimary text-white"
                        : "text-neutralPrimary hover:bg-neutralLight"
                      }
                      `}
                  > 
                    <Factory size={18} />
                    <span>Companies</span>
                  </li>

                  <li
                    onClick={() => setActiveTab(SettingsTab.COMMISSION)}
                    className={`
                        flex
                        gap-custom-16
                        items-center
                        rounded-lg
                        px-custom-16
                        py-custom-8
                        cursor-pointer
                        ${activeTab === SettingsTab.COMMISSION
                        ? "bg-mainPrimary text-white"
                        : "text-neutralPrimary hover:bg-neutralLight"
                      }
                      `}
                  >
                    <Coins size={18} />
                    <span>Commission Rules</span>
                  </li>

                 
             
                </ul>
                {/* CONTENT */}
                <div className="col-span-2 px-custom-32 py-custom-16">
                  {activeTab === "user" && (
                    <div className="flex flex-col gap-y-custom-24">
                      <div className="text-xs grid grid-cols-3 gap-custom-16 border-b border-neutralMed pb-custom-8 ">
                        <button
                          onClick={() => handleUserTabChange("active")}
                          className={`
                            px-custom-16
                            py-custom-8
                            rounded-lg
                            cursor-pointer
                            hover:scale-105
                            ease-in-out
                            duration-150
                            ${userTab === "active"
                              ? "bg-mainPrimary text-white"
                              : "bg-neutralLight"
                            }
                          `}
                        >
                          Active Users
                        </button>
                        <button
                          onClick={() => handleUserTabChange("inactive")}
                          className={`
                            px-custom-16
                            py-custom-8
                            rounded-lg
                            cursor-pointer
                            hover:scale-105
                            ease-in-out
                            duration-150
                            ${userTab === "inactive"
                              ? "bg-mainPrimary text-white"
                              : "bg-neutralLight"
                            }
                          `}
                        >
                          Inactive Users
                        </button>
      
                        <input
                          type="text"
                          value={searchText}
                          placeholder="Search users..."
                          onChange={(e) =>
                            setSearchText(
                              e.target.value
                            )
                          }
                          className="
                            w-full
                            px-custom-16
                            py-custom-8
                            border
                            border-neutralMed
                            rounded-lg
                            bg-white
                          "
                        />
                      </div>
                      {userTab === "active" && (
                        <ActiveUsers
                          Users={userList?.data ?? []}
                        />
                      )}
                      {userTab == "inactive" && (
                        <InactiveUsers
                          Users={userList?.data ?? []}
                        />
                      )}
                      <div className="flex justify-between items-center">
                          <p className="text-sm text-neutralPrimary">
                            Page {userList?.page ?? 1} of {userList?.totalPages ?? 1}
                          </p>
                          <div className="flex gap-custom-8">
                            <button
                              disabled={(userList?.page ?? 1) <= 1}
                              onClick={() => {
                                const params = new URLSearchParams(
                                  searchParams.toString()
                                );
                                params.set(
                                  "page",
                                  String((userList?.page ?? 1) - 1)
                                );
                                router.replace(
                                  `?${params.toString()}`
                                );
                              }}
                              className="
                                px-custom-16
                                py-custom-8
                                rounded-lg
                                bg-neutralLight
                                disabled:opacity-50
                              "
                            >
                              Previous
                            </button>
                            <button
                              disabled={
                                (userList?.page ?? 1) >=
                                (userList?.totalPages ?? 1)
                              }
                              onClick={() => {
                                const params = new URLSearchParams(
                                  searchParams.toString()
                                );
                                params.set(
                                  "page",
                                  String((userList?.page ?? 1) + 1)
                                );
                                router.replace(
                                  `?${params.toString()}`
                                );
                              }}
                              className="
                                px-custom-16
                                py-custom-8
                                rounded-lg
                                bg-mainPrimary
                                text-white
                                disabled:opacity-50
                              "
                            >
                              Next
                            </button>
                          </div>
                        </div>
                    </div>
                  )}
                  {activeTab === SettingsTab.BRANCH_SETTINGS &&(
                    <div className="flex flex-col gap-custom-24">
                       <div className="flex items-center justify-between gap-x-custom-16">
                         <input
                            type="text"
                            value={branchText}
                            placeholder="Search branches..."
                            onChange={(e) =>
                              setBranchText(
                                e.target.value
                              )
                            }
                            className="
                              w-full
                              px-custom-16
                              py-custom-8
                              border
                              border-neutralMed
                              rounded-lg
                              bg-white
                            "
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setIsAddBranchOpen(true)
                            }
                            className="
                              rounded-lg
                              bg-positive
                              px-custom-16
                              py-custom-8
                              text-white
                              cursor-pointer
                              transition
                              duration-150
                              ease-in-out
                              w-full
                              hover:scale-105
                            "
                          >
                            Create New Branch
                          </button>
                       </div>

                        <BranchSettings
                          Branches={
                            branchList?.data ?? []
                          }
                          isAddBranchOpen={
                            isAddBranchOpen
                          }
                          setIsAddBranchOpen={
                            setIsAddBranchOpen
                          }
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-neutralPrimary">
                            Page {branchList?.page ?? 1} of {branchList?.totalPages ?? 1}
                          </p>
                          <div className="flex gap-custom-8">
                            <button
                              disabled={(branchList?.page ?? 1) <= 1}
                              onClick={() => {
                                const params = new URLSearchParams(
                                  searchParams.toString()
                                );
                                params.set(
                                  "page",
                                  String((branchList?.page ?? 1) - 1)
                                );
                                router.replace(
                                  `?${params.toString()}`
                                );
                              }}
                              className="
                                px-custom-16
                                py-custom-8
                                rounded-lg
                                bg-neutralLight
                                disabled:opacity-50
                              "
                            >
                              Previous
                            </button>
                            <button
                              disabled={
                                (branchList?.page ?? 1) >=
                                (branchList?.totalPages ?? 1)
                              }
                              onClick={() => {
                                const params = new URLSearchParams(
                                  searchParams.toString()
                                );
                                params.set(
                                  "page",
                                  String((branchList?.page ?? 1) + 1)
                                );
                                router.replace(
                                  `?${params.toString()}`
                                );
                              }}
                              className="
                                px-custom-16
                                py-custom-8
                                rounded-lg
                                bg-mainPrimary
                                text-white
                                disabled:opacity-50
                              "
                            >
                              Next
                            </button>
                          </div>
                        </div>
                    </div>
                  )}  
                  {activeTab === SettingsTab.COMPANY &&(
                    <div className="flex flex-col gap-custom-24">
                       <div className="flex items-center justify-between gap-x-custom-16">
                         <input
                            type="text"
                            value={companyText}
                            placeholder="Search company..."
                            onChange={(e) =>
                              setCompanyText(
                                e.target.value
                              )
                            }
                            className="
                              w-full
                              px-custom-16
                              py-custom-8
                              border
                              border-neutralMed
                              rounded-lg
                              bg-white
                            "
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setIsAddCompanyOpen(true)
                            }
                            className="
                              rounded-lg
                              bg-positive
                              px-custom-16
                              py-custom-8
                              text-white
                              cursor-pointer
                              transition
                              duration-150
                              ease-in-out
                              w-full
                              hover:scale-105
                            "
                          >
                            Create New Company
                          </button>
                       </div>

                        <CompanySettings
                          Companies={
                            companyList?.data ?? []
                          }
                          isAddCompanyOpen={
                            isAddCompanyOpen
                          }
                          setIsAddCompanyOpen={
                            setIsAddCompanyOpen
                          }
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-neutralPrimary">
                            Page {companyList?.page ?? 1} of {companyList?.totalPages ?? 1}
                          </p>
                          <div className="flex gap-custom-8">
                            <button
                              disabled={(companyList?.page ?? 1) <= 1}
                              onClick={() => {
                                const params = new URLSearchParams(
                                  searchParams.toString()
                                );
                                params.set(
                                  "page",
                                  String((companyList?.page ?? 1) - 1)
                                );
                                router.replace(
                                  `?${params.toString()}`
                                );
                              }}
                              className="
                                px-custom-16
                                py-custom-8
                                rounded-lg
                                bg-neutralLight
                                disabled:opacity-50
                              "
                            >
                              Previous
                            </button>
                            <button
                              disabled={
                                (companyList?.page ?? 1) >=
                                (companyList?.totalPages ?? 1)
                              }
                              onClick={() => {
                                const params = new URLSearchParams(
                                  searchParams.toString()
                                );
                                params.set(
                                  "page",
                                  String((companyList?.page ?? 1) + 1)
                                );
                                router.replace(
                                  `?${params.toString()}`
                                );
                              }}
                              className="
                                px-custom-16
                                py-custom-8
                                rounded-lg
                                bg-mainPrimary
                                text-white
                                disabled:opacity-50
                              "
                            >
                              Next
                            </button>
                          </div>
                        </div>
                    </div>
                  )}  

                  {activeTab === SettingsTab.COMMISSION && (
                    <div className="flex flex-col gap-custom-24">
      
                      {/* SUB NAVIGATION */}
                      <div className="text-xs grid grid-cols-3 gap-custom-16 border-b border-neutralMed pb-custom-8 ">
                        <button
                          onClick={() => setCommissionTab("coded")}
                          className={`
                            px-custom-16
                            py-custom-8
                            rounded-lg
                            cursor-pointer
                            hover:scale-105
                            ease-in-out
                            duration-150
                            ${commissionTab === "coded"
                              ? "bg-mainPrimary text-white"
                              : "bg-neutralLight"
                            }
                          `}
                        >
                          Coded Rules
                        </button>
                        <button
                          onClick={() => setCommissionTab("expired")}
                          className={`
                            px-custom-16
                            py-custom-8
                            rounded-lg
                            cursor-pointer
                            hover:scale-105
                            ease-in-out
                            duration-150
                            ${commissionTab === "expired"
                              ? "bg-mainPrimary text-white"
                              : "bg-neutralLight"
                            }
                          `}
                        >
                          Expired Rules
                        </button>
                        <button
                          onClick={() => setCommissionTab("override")}
                          className={`
                            px-custom-16
                            py-custom-8
                            rounded-lg
                            cursor-pointer
                            hover:scale-105
                            ease-in-out
                            duration-150
                            ${commissionTab === "override"
                              ? "bg-mainPrimary text-white"
                              : "bg-neutralLight"
                            }
                          `}
                        >
                          Override Rules
                        </button>
                      </div>
                      {/* CODED */}
                      {commissionTab === "coded" && (
                        <CodedRules
                          rules={data?.commissionRules ?? []}
                        />
                      )}
                      {/* EXPIRED */}
                      {commissionTab === "expired" && (
                        <ExpiredRules
                          rules={data?.commissionRules ?? []}
                        />
                      )}
                      {/* OVERRIDE */}
                      {commissionTab === "override" && (
                        <OverrideRules
                          rules={data?.overrideRules ?? []}
                        />
                      )}
                    </div>
                  )}
                  
                </div>
              </div>
              <div></div>
            </div>
          </MainModal>
        )}


        {openPermission && (
          <MainModal size="xxl"  onClose={handleClosePermission}
              showCloseButton={false}>
            <div className="
                  py-custom-24
                "
            >

              <div className="px-custom-24">
                <PermissionsTab/>
              </div>

            </div>

            </MainModal>
            )}

                  {openAdminReactivation && (
                      <MainModal
                        size="md"
                        onClose={() => {
                          handleCloseAdminReactivation()
                        }}
                      >
                        <div className="flex flex-col gap-custom-16">
                          <div className="w-full flex items-start justify-start bg-mainPrimary py-custom-16 px-custom-32 rounded-t-xl">
                            <Image
                              src="/images/AMSLOGO.svg"
                              alt="JameroGroupOfCompanies"
                              width={160}
                              height={160}
                              priority
                            />
                          </div>
                          <div className="px-custom-32 flex flex-col gap-y-custom-8">
                            <h1 className="text-mdHeader font-bold text-mainPrimary">
                              Admin Reactivation Request
                            </h1>
                            <p>
                              Upload your formal written reactivation request.
                              Accepted files: PDF, JPG, JPEG, or PNG.
                            </p>
                          </div>

                          {/* SEARCH */}
                          <div className="relative flex flex-col gap-2 px-custom-32">

                              <label className="font-bold text-xs">
                              Search Agent Name 
                              </label>

                              <input
                              type="search"
                              value={searchAgent}
                              onChange={(e) => {

                                  setSearchAgent(
                                  e.target.value
                                  );

                                  setShowDropdown(true);
                              }}
                              className="
                                  border
                                  border-neutralPrimary
                                  rounded-lg
                                  px-4 py-3
                                  w-full
                              "
                              />

                              {/* DROPDOWN */}
                              {showDropdown &&
                              agents.length > 0 &&
                              searchAgent && (

                              <div
                                  className="
                                  absolute
                                  top-full
                                  left-8
                                  w-[90%]
                                  bg-white
                                  border
                                  border-neutralMed
                                  rounded-lg
                                  shadow-md
                                  z-50
                                  mt-1
                                  max-h-60
                                  overflow-y-auto

                                  "
                              >

                                  {agents.map((agent) => (

                                  <button
                                      key={agent.id}
                                      type="button"
                                      onClick={() => {

                                      setSelectedAgent(
                                      agent
                                      );

                                      setSearchAgent(
                                      agent.agentCode
                                      );

                                      setShowDropdown(false);
                                      }}
                                      className="
                                      w-full
                                      text-left
                                      px-4
                                      py-3
                                      hover:bg-neutralLight
                                      "
                                  >

                                      <div className="flex flex-col">

                                      <span className="font-semibold">
                                          {agent.fullName} 
                                      </span>

                                      <span className="text-xs text-neutralPrimary">
                                           {agent.agentCode} • {agent.level}
                                      </span>

                                      </div>

                                  </button>

                                  ))}

                              </div>
                              )}

                          </div>

                          <div className="px-custom-32 pb-custom-32 flex flex-col gap-custom-16">
                            <div className="flex flex-col gap-y-custom-8">
                              <label className="font-bold text-xs">
                                Formal Written Reactivation Request
                              </label>
                              <input
                                type="file"
                                accept="application/pdf,image/png,image/jpeg,image/jpg"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setFormalRequestFile(file);
                                }}
                                className="
                                  bg-neutralLight
                                  border
                                  border-neutralMed
                                  py-3
                                  px-custom-16
                                  rounded-lg
                                "
                              />
                            </div>
                            {formalRequestFile && 
                            selectedAgent &&
                            (
                              <div className="bg-neutralLight p-custom-16 rounded-xl">
                                <p className="text-xs text-neutralPrimary">
                                  Selected File
                                </p>
                                <h2 className="font-bold text-mainPrimary break-all">
                                  {formalRequestFile.name}
                                </h2>
                              </div>
                            )}
                            <button
                              type="button"
                              disabled={
                                !selectedAgent       ||
                                !formalRequestFile ||
                                isSubmittingAdminRequest
                              }
                              onClick={handleAdminReactivationSubmit}
                              className="
                                w-full
                                text-white
                                bg-mainPrimary
                                p-3
                                rounded-lg
                                font-bold
                                disabled:opacity-50
                                disabled:cursor-not-allowed
                                cursor-pointer
                                hover:bg-lightPrimary
                                ease-in-out
                                duration-150
                              "
                            >
                              {isSubmittingAdminRequest
                                ? "Submitting..."
                                : "Submit Request for Admin Approval"}
                            </button>
                          </div>
                        </div>
                      </MainModal>
                    )}

                    
                     {agentUpdate && (
                          <MainModal size="md"   onClose={handleCloseAgentUpdate}>
                    
                              <div
                                className="
                                  flex
                                  flex-col
                                  gap-custom-16
                                "
                              >
                              <div className="w-full flex items-start justify-start bg-mainPrimary py-custom-16 px-custom-32 rounded-t-xl">
                                 <Image
                                   src="/images/AMSLOGO.svg"
                                   alt="JameroGroupOfCompanies"
                                   width={160}
                                   height={160}
                                   priority
                                 />
                              </div>
                    
                              <div className="px-custom-32 flex flex-col gap-y-custom-8">
                                    <h1 className="text-mdHeader font-bold text-mainPrimary">Update Your Profile</h1>
                                    <p>Configure account information and password to enable secure access.</p>
                              </div>
                    
                              <form
                                  onSubmit={editform.handleSubmit(
                                    onSubmitEdit
                                  )}
                                  className="flex flex-col gap-y-custom-16 w-full px-custom-32 pb-custom-32"
                                >
                                <div className="flex flex-col gap-y-custom-8">
                                  <label htmlFor="name" className="font-bold text-xs">Email Address</label>
                                  <input
                                  className="bg-neutralLight border border-neutralMed py-3 px-custom-16 rounded-lg"
                                    placeholder="Email"
                                    {...editform.register("email")}
                                  />
                                </div>
                             
                                <div className="relative flex flex-col gap-y-custom-8">
                                  <label
                                    htmlFor="password"
                                    className="font-bold text-xs"
                                  >
                                    New Password
                                  </label>
                                  <input
                                    className="
                                      bg-neutralLight
                                      border
                                      border-neutralMed
                                      py-3
                                      px-custom-16
                                      rounded-lg
                                    "
                                    type="password"
                                    placeholder="Password"
                                    {...editform.register("password")}
                                  />
                                  {editform.formState.errors.password && (
                                    <p className="absolute -bottom-4 text-negative text-xs">
                                      {editform.formState.errors.password.message}
                                    </p>
                                  )}
                                </div>
                                <div className="relative flex flex-col gap-y-custom-8">
                                  <label
                                    htmlFor="confirmPassword"
                                    className="font-bold text-xs"
                                  >
                                    Confirm Password
                                  </label>
                                  <input
                                    className="
                                      bg-neutralLight
                                      border
                                      border-neutralMed
                                      py-3
                                      px-custom-16
                                      rounded-lg
                                      disabled:opacity-50
                                    "
                                    type="password"
                                    placeholder="Confirm Password"
                                    disabled={!password}
                                    {...editform.register("confirmPassword")}
                                  />
                                  {editform.formState.errors.confirmPassword && (
                                    <p className="absolute -bottom-4 text-negative text-xs">
                                      {
                                        editform.formState.errors
                                          .confirmPassword?.message
                                      }
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="submit"
                                  disabled={!isDirty || isSubmitting}
                                  className="
                                    text-white
                                    p-3
                                    rounded-lg
                                    text-body
                                    font-bold
                                    bg-mainPrimary
                                    disabled:opacity-50
                                    disabled:cursor-not-allowed
                                    cursor-pointer
                                    hover:bg-lightPrimary
                                    ease-in-out
                                    duration-150
                                  "
                                >
                                  {isSubmitting
                                    ? "Updating..."
                                    : "Update Account Details"}
                                </button>
                              </form>
                    
                    
                              </div>
                        </MainModal>
                      )}
              

      </div>
    </PermissionGuard>
  );
}