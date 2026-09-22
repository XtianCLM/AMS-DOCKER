"use client";

import { useEffect, useState } from "react";

import { useWatch } from "react-hook-form";

import { useAuth } from "@/components/context/UserContext";
import Image from "next/image";
import { User2 } from "lucide-react";
import QRCode from "react-qr-code";
import SweetAlert from "@/components/modal/Swal";
import { getErrorMessage } from "@/components/helper/errorHelper";
import MainModal from "@/components/modal/mainModal";
import { useForm } from "react-hook-form";
import { updateAccSchema, UpdateAgentAccSchema } from "@repo/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUpdateAgentAccount } from "@/hooks/agents/useAgent";
import PermissionGuard from "@/components/guard/PermissionGuard";

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {


  const { user, loading, logout,refreshUser } =
    useAuth();


  const {
    mutateAsync:
    updateAgentAccount
  } =
    useUpdateAgentAccount();

    const [openProfile, setOpenProfile] = useState(false);

    const [agentUpdate, setAgentUpdate] = useState(false);


  const form =
        useForm<UpdateAgentAccSchema>({
          resolver:
            zodResolver(updateAccSchema),
    
          defaultValues: {
            email: "",
            agentTel: "",
            password: ""
          }
        })

  const onSubmit = async (
    data: UpdateAgentAccSchema
  ) => {

    try {

      await updateAgentAccount(
        data
      );

      await refreshUser();

      form.reset({
        email:
          data.email ?? "",

        agentTel:
          data.agentTel,

        password: "",

        confirmPassword: "",
      });

      SweetAlert.successAlert(
        "Success",
        "Account updated successfully."
      );

      handleCloseAgentUpdate();

    } catch{

      SweetAlert.errorAlert(
        "Error",
        "Failed to update account."
      );
    }
  };
  
  useEffect(() => {
    if (agentUpdate && user?.agent) {
      form.reset({
        email: user.agent.email ?? "",
        agentTel: user.agent.telephone ?? "",
        password: "",
        confirmPassword: "",
      });
    }
  }, [agentUpdate, user, form]);


  const {
    formState: {
      isDirty,
      isSubmitting
    }
  } = form;



  const password = useWatch({
    control: form.control,
    name: "password",
  });
  

  // // =========================
  // // PROTECT ROUTE
  // // =========================

  // useEffect(() => {

  //   // still loading user
  //   if (loading) return;

  //   // not logged in
  //   if (!user) {
  //     router.replace("/login");
  //     return;
  //   }

  //   // no permission
  //   const hasAccess =
  //     user.permissions.includes(
  //       "PROFILE_ACCESS"
  //     );

  //   if (!hasAccess) {
  //     router.replace(
  //       "/unauthorized"
  //     );
  //   }

  // }, [user, loading, router]);



  // =========================
  // LOADING SCREEN
  // =========================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // =========================
  // BLOCK PAGE
  // =========================

  if (!user) return null;

  // =========================
  // LAYOUT UI
  // =========================

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

  const handleCloseAgentUpdate = () => {

    if (!form.formState.isDirty) {
      setAgentUpdate(false);
      return;
    }

    SweetAlert.confirmationAlert(
      "Discard Changes?",
      "Any unsaved changes will be lost.",
      () => {

        form.reset({
          email: user?.agent?.email ?? "",
          agentTel:
            user?.agent?.telephone ?? "",
          password: "",
          confirmPassword: "",
        });

        setAgentUpdate(false);
      }
    );
  };



  return (
    <PermissionGuard permission="PROFILE_ACCESS">
      <div className="flex flex-col min-h-screen bg-linear-to-b from-mainPrimary to-mainPrimary">
      
        <header
          className="
            sticky
            top-0
            z-60
            h-custom-64
            shrink-0
            bg-mainPrimary
            shadow-md
            flex
            justify-between
            items-center
            px-custom-24
          "
        >
          <Image
            src="/images/AMSLOGO.svg"
            alt="JameroGroupOfCompanies"
            width={160}
            height={160}
            priority
          />
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
          {/* PROFILE DRAWER */}
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
                    Agent Profile
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
                  <div className="w-full flex flex-col items-center justify-center gap-custom-8">
      
                            <QRCode
                                value={user?.agent?.agentCode || ""}
                                size={80}
                            />
      
                            <h6>{user?.agent?.agentCode}</h6>
                        
                  </div>
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
                      Telephone
                    </h2>
                    <p className="font-bold text-sm">
                       {user?.agent?.telephone}
                    </p>
                  </div>
      
      
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
                      {user.agent?.email}
                    </p>
                  </div>
      
                  <div className="flex w-full justify-start items-center gap-custom-16 text-white">
                      <button onClick={()=>{
                        setAgentUpdate(true);
                      }} className="w-full text-sm font-bold bg-secondary
                       py-custom-8 px-custom-16 rounded-lg cursor-pointer hover:scale-105 ease-in-out duration-150">
                        Edit Profile
                      </button>
                   
                  </div>
                  <button   onClick={handleLogout} className="w-full text-sm font-bold text-white bg-neutralPrimary py-custom-8 px-custom-16 rounded-lg cursor-pointer hover:scale-105 ease-in-out duration-150">
                        Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </header>
        {/* CONTENT */}
        <main className="p-6">
          {children}
        </main>

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
                    onSubmit={form.handleSubmit(
                      onSubmit,
                      (errors) => {
                        console.log("FORM VALIDATION FAILED:", errors);
                      }
                    )}
                    className="flex flex-col gap-y-custom-16 w-full px-custom-32 pb-custom-32"
                  >
                  <div className="flex flex-col gap-y-custom-8">
                    <label htmlFor="name" className="font-bold text-xs">Email Address</label>
                    <input
                    className="bg-neutralLight border border-neutralMed py-3 px-custom-16 rounded-lg"
                      placeholder="Email"
                      {...form.register("email")}
                    />
                  </div>
                 <div className="flex flex-col gap-y-custom-8">
                  <label
                    htmlFor="agentTel"
                    className="font-bold text-xs"
                  >
                    Telephone Number
                  </label>

                  <input
                    id="agentTel"
                    className="bg-neutralLight border border-neutralMed py-3 px-custom-16 rounded-lg"
                    placeholder="Telephone"
                    {...form.register("agentTel")}
                  />

                  {form.formState.errors.agentTel && (
                    <p className="text-negative text-xs">
                      {form.formState.errors.agentTel.message}
                    </p>
                  )}
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
                      {...form.register("password")}
                    />
                    {form.formState.errors.password && (
                      <p className="absolute -bottom-4 text-negative text-xs">
                        {form.formState.errors.password.message}
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
                      {...form.register("confirmPassword")}
                    />
                    {form.formState.errors.confirmPassword && (
                      <p className="absolute -bottom-4 text-negative text-xs">
                        {
                          form.formState.errors
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