"use client"

import { getErrorMessage } from "@/components/helper/errorHelper";
import MainModal from "@/components/modal/mainModal";
import SweetAlert from "@/components/modal/Swal";
import ModuleHeader from "@/components/ui/commonUi/page.header";
import { useAdminWithdrawals } from "@/hooks/transaction/useTransaction";
import { useApproveWithdrawalRequest, useRejectFailedWithdrawalRequest } from "@/hooks/withdrawal/useWithdrawal";
import { socket } from "@/lib/socket";
import { AdminWithdrawalRequest } from "@repo/shared";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Inspect } from "lucide-react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import Swal from "sweetalert2";


export default function Transaction() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const queryClient = useQueryClient();

    useEffect(() => {
        socket.emit("join-admin-payment-room");

        const handlePaymentUpdated = () => {
            queryClient.invalidateQueries({
                queryKey: ["admin-reactivation-payments"],
            });
        };

        socket.on(
            "admin-payment-updated",
            handlePaymentUpdated
        );

        return () => {
            socket.off(
                "admin-payment-updated",
                handlePaymentUpdated
            );
        };


    }, [queryClient]);

    const searchParam = searchParams.get("search") || "";
    
    const [search, setSearch] = useState(searchParam);

    const page = Math.max(
        1,
        Number(
            searchParams.get("page") || "1"
        )
    );

    const {
    data: withdrawalData,
    isLoading: isWithdrawalLoading,
    } = useAdminWithdrawals({
    page,
    limit: 10,
    search: search.trim() || undefined,
    });

    const {
    mutateAsync: rejectWithdrawal,
    } = useRejectFailedWithdrawalRequest();


    const [selectedWithdraw, setSelectedWithdraw] = useState<AdminWithdrawalRequest | null>(null);
    const [openWithdrawDetails, setOpenWithdrawDetails]= useState(false);
    const [receiptWithdrawalId, setReceiptWithdrawalId] =
        useState<string | null>(null);

    const receiptUploadUrl = receiptWithdrawalId
        ? `${window.location.origin}/upload-receipt/${receiptWithdrawalId}`
        : "";

        
    const [openReceiptQR, setOpenReceiptQR] =
        useState(false);

    const handleViewWithrawDetails = (
    withdraw:AdminWithdrawalRequest
    )=> {
        setSelectedWithdraw(withdraw);
        setOpenWithdrawDetails(true);
    }

    const handleCloseWithdrawDetails = () => {
        setSelectedWithdraw(null);
        setOpenWithdrawDetails(false);
    };


    const {
    mutateAsync: approveWithdrawal,
    isPending: isApprovingWithdrawal,
    } = useApproveWithdrawalRequest();




    const handleApproveWithdrawal = (
        withdrawalId: string
    ) => {
        SweetAlert.confirmationAlert(
            "Transaction Complete?",
            "Generate a QR code so you can upload the transaction receipt.",
            async () => {
                try {
                    Swal.close();

                    setReceiptWithdrawalId(withdrawalId);
                    setOpenWithdrawDetails(false);
                    setOpenReceiptQR(true);

                } catch (error) {
                    Swal.close();

                    SweetAlert.errorAlert(
                        "Transaction Completion Failed",
                        getErrorMessage(error)
                    );
                }
            }
        );
    };

    const handleRejectWithdrawal = async (
    withdrawalId: string
    ) => {
    const { value: remarks } = await Swal.fire({
        title: "Cancel Withdrawal",
        text: "Please provide the reason for cancellation of this withdrawal.",
        input: "textarea",
        inputPlaceholder: "Enter cancellation reason...",
        inputAttributes: {
        "aria-label": "Rejection reason",
        },
        showCancelButton: true,
        confirmButtonText: "Cancel Transaction",
        confirmButtonColor: "#dc2626",
        cancelButtonText: "Close",
        inputValidator: (value) => {
        if (!value?.trim()) {
            return "Rejection remarks are required.";
        }
        return null;
        },
    });

    if (!remarks) return;

    try {
        await rejectWithdrawal({
        withdrawalId,
        remarks: remarks.trim(),
        });

        SweetAlert.successAlert(
        "Rejected",
        "Withdrawal request has been rejected."
        );
    } catch (error) {
        SweetAlert.errorAlert(
        "Reject Failed",
        getErrorMessage(error)
        );
    }
    };


    const updateQueryParams = (
    nextPage: number
    ) => {
    const totalPages =
        withdrawalData?.totalPages ?? 1;

    const safePage = Math.min(
        Math.max(nextPage, 1),
        totalPages
    );

    const params = new URLSearchParams(
        searchParams.toString()
    );

    params.set(
        "page",
        String(safePage)
    );

    if (search.trim()) {
        params.set(
        "search",
        search.trim()
        );
    } else {
        params.delete("search");
    }

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
                title="Agent Credits"
                subtitle="Withdrawals"
                />
                <div className="w-full flex justify-end">

                <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => {
                        const value =
                        e.target.value;
                        setSearch(value);
                        const params =
                        new URLSearchParams(
                            searchParams.toString()
                        );
                        if (value.trim()) {
                        params.set(
                            "search",
                            value
                        );
                        } else {
                        params.delete("search");
                        }
                        params.set("page", "1");
                        router.replace(
                        `${pathname}?${params.toString()}`
                        );
                    }}
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
                            Amount
                        </th>

                        <th className="text-left px-custom-24 py-5 font-semibold">
                            Channel
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

                        {isWithdrawalLoading && (
                        <tr>

                            <td
                            colSpan={5}
                            className="text-center py-10"
                            >
                            Loading...
                            </td>

                        </tr>
                        )}

                
                        {!isWithdrawalLoading &&
                        withdrawalData?.data.length === 0 && (
                            <tr>

                            <td
                                colSpan={5}
                                className="
                                text-center
                                py-10
                                text-neutralPrimary
                                "
                            >
                                NO AGENTS WITHRAWAL FOUND.
                            </td>

                            </tr>
                        )}


                        {!isWithdrawalLoading &&
                        withdrawalData?.data.map(
                            (withdraw) => (

                            <tr
                                key={withdraw.id}
                                className="
                                text-neutralPrimary
                                text-body
                                odd:bg-neutralLight
                                "
                            >

                        
                                <td className="text-left px-6 py-4 font-semibold">

                                <QRCode
                                    value={withdraw.agent.agentCode || ""}
                                    size={50}
                                />
                                
                                
                                </td>

                            
                                <td className="text-left px-6 py-4 font-semibold capitalize">

                                {withdraw.agent.fullName}

                                </td>

                            
                                <td className="text-left px-6 py-4 font-semibold">

                                {withdraw.amount}

                                </td>

                                <td className="text-left px-6 py-4 font-semibold">

                                {withdraw.payoutChannel}

                                </td>

                                
                                <td className="text-left px-6 py-4">
                                <span
                                    className={`
                                    inline-flex items-center justify-center
                                    w-fit
                                    rounded-md
                                    px-custom-16 py-1
                                    text-xs font-semibold text-white
                                    ${
                                        withdraw.status === "COMPLETED"
                                        ? "bg-positive"
                                        : withdraw.status === "REJECTED"
                                        ? "bg-negative"
                                        : withdraw.status === "FAILED"
                                        ? "bg-darkPrimary"
                                        : withdraw.status === "PROCESSING"
                                        ? "bg-mainPrimary"
                                        
                                        : "bg-secondary"



                                    }
                                    `}
                                >
                                    {withdraw.status}
                                </span>
                                </td>

                                <td className="text-left px-6 py-4">

                                <div className="flex items-center gap-3">


                                    <button
                                        title="Edit Details"
                                        onClick={() =>
                                            handleViewWithrawDetails(withdraw)
                                        }
                                        className="
                                            px-custom-16
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
                                        <Inspect size={20}/> View Details
                                    </button>


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
                        {withdrawalData?.page || 1}
                        </span>{" "}

                        of{" "}

                        <span className="font-semibold">
                        {withdrawalData?.totalPages || 1}
                        </span>

                    </div>

                    <div className="flex items-center gap-3">

                        <button
                        disabled={page <= 1}
                        onClick={() =>
                            updateQueryParams(page - 1)
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
                        disabled={
                            page >=
                            (withdrawalData?.totalPages ?? 1)
                        }
                        onClick={() =>
                            updateQueryParams(page + 1)
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

                {/* )} */}


                    {openWithdrawDetails && selectedWithdraw && (
                    <MainModal
                        size="lg"
                        onClose={handleCloseWithdrawDetails}
                    >
                        <div className="w-full flex flex-col gap-y-custom-24 p-custom-32">
                            <div className="border-b border-neutralMed pb-custom-16">
                                <h2 className="text-mdHeader font-bold text-mainPrimary">
                                Withdrawal Details
                                </h2>

                                <p className="text-sm text-neutralPrimary">
                                Reactivation payment transaction information.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-custom-16">

                                <div className="bg-neutralLight rounded-xl p-custom-16">
                                    <p className="text-xs text-neutralPrimary">
                                        Agent Name
                                    </p>
                                    <h3 className="font-bold text-mainPrimary capitalize">
                                        {selectedWithdraw.agent.fullName}
                                    </h3>
                                </div>

                                <div className="bg-neutralLight rounded-xl p-custom-16">
                                    <p className="text-xs text-neutralPrimary">
                                        Agent Code
                                    </p>
                                    <h3 className="font-bold text-mainPrimary">
                                        {selectedWithdraw.agent.agentCode}
                                    </h3>
                                </div>

                                <div className="bg-neutralLight rounded-xl p-custom-16">
                                    <p className="text-xs text-neutralPrimary">
                                        Agent Level
                                    </p>
                                    <h3 className="font-bold text-mainPrimary">
                                        {selectedWithdraw.agent.level}
                                    </h3>
                                </div>

                                <div className="bg-neutralLight rounded-xl p-custom-16">
                                    <p className="text-xs text-neutralPrimary">
                                        Amount
                                    </p>
                                    <h3 className="font-bold text-mainPrimary">
                                        ₱{Number(selectedWithdraw.amount).toLocaleString()}
                                    </h3>
                                </div>

                                <div className="bg-neutralLight rounded-xl p-custom-16">
                                    <p className="text-xs text-neutralPrimary">
                                    Payout Channel
                                    </p>
                                    <h3 className="font-bold text-mainPrimary">
                                        {selectedWithdraw.payoutChannel}
                                    </h3>
                                </div>


                                <div className="bg-neutralLight rounded-xl p-custom-16">
                                    <p className="text-xs text-neutralPrimary">
                                        Status
                                    </p>
                                    <span
                                        className={`
                                        inline-flex
                                        w-fit
                                        rounded-md
                                        px-custom-16
                                        py-1
                                        text-xs
                                        font-semibold
                                        text-white
                                        ${
                                            selectedWithdraw.status === "COMPLETED"
                                            ? "bg-positive"
                                            : selectedWithdraw.status === "REJECTED"
                                            ? "bg-negative"
                                            : selectedWithdraw.status === "FAILED"
                                            ? "bg-darkPrimary"
                                            : selectedWithdraw.status === "PROCESSING"
                                            ? "bg-mainPrimary"
                                            
                                            : "bg-secondary"
                                        }
                                        `}
                                    >
                                        {selectedWithdraw.status}
                                    </span>
                                </div>

                                {/* <div className="bg-neutralLight rounded-xl p-custom-16">
                                    <p className="text-xs text-neutralPrimary">
                                        Xendit Fee
                                    </p>
                                    <h3 className="font-bold text-negative">
                                        ₱{Number(selectedWithdraw.companyExpenseTotal ?? 0).toLocaleString()}
                                    </h3>
                                </div> */}
{/* 
                                <div className="bg-neutralLight rounded-xl p-custom-16">
                                    <p className="text-xs text-neutralPrimary">
                                        Total Company Cost
                                    </p>
                                    <h3 className="font-bold text-mainPrimary">
                                        ₱
                                        {(
                                        Number(selectedWithdraw.amount) -
                                        Number(selectedWithdraw.companyExpenseTotal ?? 0)
                                        ).toLocaleString()}
                                    </h3>
                                </div> */}


                                {/* <div className="bg-neutralLight rounded-xl p-custom-16 md:col-span-2">
                                    <p className="text-xs text-neutralPrimary">
                                        Xendit Disbursement ID
                                    </p>
                                    <h3 className="font-bold text-mainPrimary break-all">
                                        {selectedWithdraw.xenditDisbursementId ?? "-"}
                                    </h3>
                                </div>

                                <div className="bg-neutralLight rounded-xl p-custom-16 md:col-span-2">
                                    <p className="text-xs text-neutralPrimary">
                                        Xendit External ID
                                    </p>
                                    <h3 className="font-bold text-mainPrimary break-all">
                                        {selectedWithdraw.xenditExternalId ?? "-"}
                                    </h3>
                                </div> */}

                                <div className="bg-neutralLight rounded-xl p-custom-16">
                                    <p className="text-xs text-neutralPrimary">
                                        Created At
                                    </p>
                                    <h3 className="font-bold text-mainPrimary">
                                        {new Date(selectedWithdraw.createdAt).toLocaleString()}
                                    </h3>
                                </div>

                                <div className="bg-neutralLight rounded-xl p-custom-16">
                                    <p className="text-xs text-neutralPrimary">
                                        Request At
                                    </p>
                                    <h3 className="font-bold text-mainPrimary">
                                        {selectedWithdraw.requestedAt
                                        ? new Date(selectedWithdraw.requestedAt).toLocaleString()
                                        : "-"}
                                    </h3>
                                </div>
                            </div>

                            {selectedWithdraw.status === "PENDING" && (
                            <div className="flex flex-col gap-custom-16">
                                <button
                                    type="button"
                                    disabled={isApprovingWithdrawal}
                                    onClick={() =>
                                    handleApproveWithdrawal(selectedWithdraw.id)
                                    }
                                    className="
                                    w-full
                                    bg-lightPrimary
                                    hover:bg-mainPrimary
                                    text-white
                                    py-custom-16
                                    cursor-pointer
                                    rounded-xl
                                    font-bold
                                    disabled:opacity-50
                                    disabled:cursor-not-allowed
                                    "
                                >
                                    {isApprovingWithdrawal
                                    ? "Processing Payout..."
                                    : "Complete Transaction"}
                                </button>

                                <button
                                    type="button"
                                    disabled={isApprovingWithdrawal}
                                    onClick={() =>
                                    handleRejectWithdrawal(selectedWithdraw.id)
                                    }
                                    className="
                                    w-full
                                    bg-neutralMed
                                    hover:bg-neutralPrimary
                                    hover:text-neutralLight
                                    text-neutralPrimary
                                    py-custom-16
                                    cursor-pointer
                                    rounded-xl
                                    font-bold
                                    disabled:opacity-50
                                    disabled:cursor-not-allowed
                                    "
                                >
                                    {isApprovingWithdrawal
                                    ? "Processing Payout..."
                                    : "Cancel Transaction"}
                                </button>
                            </div>
                            )}
                        </div>
                    </MainModal>
                    )}


                    {openReceiptQR && receiptWithdrawalId && (
                        <MainModal
                            size="lg"
                            onClose={() => {
                                setOpenReceiptQR(false);
                                setReceiptWithdrawalId(null);
                                setSelectedWithdraw(null);
                            }}
                        >
                            <div className="w-full flex flex-col items-center gap-y-custom-24 p-custom-32">

                                <div className="w-full text-center border-b border-neutralMed pb-custom-16">
                                    <h2 className="text-mdHeader font-bold text-mainPrimary">
                                        Upload Transaction Receipt
                                    </h2>

                                    <p className="text-sm text-neutralPrimary">
                                        Scan this QR code using your phone to upload the image.
                                    </p>
                                </div>

                                {selectedWithdraw && (
                                    <div className="w-full grid grid-cols-2 gap-custom-16">

                                        <div className="bg-neutralLight rounded-xl p-custom-16">
                                            <p className="text-xs text-neutralPrimary">
                                                Agent
                                            </p>

                                            <p className="font-bold text-mainPrimary">
                                                {selectedWithdraw.agent.fullName}
                                            </p>
                                        </div>

                                        <div className="bg-neutralLight rounded-xl p-custom-16">
                                            <p className="text-xs text-neutralPrimary">
                                                Amount
                                            </p>

                                            <p className="font-bold text-mainPrimary">
                                                ₱
                                                {Number(
                                                    selectedWithdraw.amount
                                                ).toLocaleString()}
                                            </p>
                                        </div>

                                    </div>
                                )}

                                <div
                                    className="
                                        bg-white
                                        p-custom-24
                                        rounded-xl
                                        border
                                        border-neutralMed
                                        shadow-sm
                                    "
                                >
                                    <QRCode
                                        value={receiptUploadUrl}
                                        size={250}
                                    />
                                </div>

                                <div className="text-center">
                                    <p className="font-semibold text-mainPrimary">
                                        Scan to upload receipt
                                    </p>

                                    <p className="text-sm text-neutralPrimary mt-1">
                                        Withdrawal ID
                                    </p>

                                    <p className="text-sm font-semibold break-all">
                                        {receiptWithdrawalId}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpenReceiptQR(false);
                                        setReceiptWithdrawalId(null);
                                        setSelectedWithdraw(null);
                                    }}
                                    className="
                                        w-full
                                        bg-neutralMed
                                        hover:bg-neutralPrimary
                                        hover:text-white
                                        text-neutralPrimary
                                        py-custom-16
                                        rounded-xl
                                        font-bold
                                        cursor-pointer
                                        transition
                                    "
                                >
                                    Close
                                </button>

                            </div>
                        </MainModal>
                    )}
    </div>
  );
}