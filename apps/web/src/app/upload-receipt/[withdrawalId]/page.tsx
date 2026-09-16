"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useUploadWithdrawalReceipt } from "@/hooks/withdrawal/useWithdrawal";
import SweetAlert from "@/components/modal/Swal";

export default function UploadReceiptPage() {
    const params = useParams();



    const withdrawalId =
        params.withdrawalId as string;

    const [receipt, setReceipt] =
        useState<File | null>(null);

    const [preview, setPreview] =
        useState<string | null>(null);


    const {
        mutateAsync: uploadReceipt,
        isPending: uploading,
    } = useUploadWithdrawalReceipt();

    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        if (!file) return;

        setReceipt(file);

        setPreview(
            URL.createObjectURL(file)
        );
    };
    const handleUpload = async () => {
        if (!receipt) return;

        try {
            await uploadReceipt({
                withdrawalId,
                receipt,
            });

            setReceipt(null);
            setPreview(null);

            SweetAlert.successAlert(
                "Upload Successful",
                "Receipt uploaded successfully."
            );

        } catch (error) {
            console.error(error);

            SweetAlert.errorAlert(
                "Upload Failed",
                "Failed to upload receipt."
            );
        }
    };

    return (
        <div
            className="
                min-h-screen
                bg-neutralLight
                flex
                items-center
                justify-center
                p-4
            "
        >
            <div
                className="
                    w-full
                    max-w-md
                    bg-white
                    rounded-2xl
                    shadow
                    p-6
                "
            >
                <h1
                    className="
                        text-xl
                        font-bold
                        text-mainPrimary
                    "
                >
                    Upload Receipt
                </h1>

                <p
                    className="
                        text-sm
                        text-neutralPrimary
                        mt-1
                    "
                >
                    Upload the receipt for this
                    withdrawal transaction.
                </p>

                <div
                    className="
                        mt-6
                        bg-neutralLight
                        p-4
                        rounded-xl
                    "
                >
                    <p className="text-xs">
                        Withdrawal ID
                    </p>

                    <p
                        className="
                            font-semibold
                            break-all
                        "
                    >
                        {withdrawalId}
                    </p>
                </div>

                <label
                    className="
                        block
                        mt-6
                        border-2
                        border-dashed
                        rounded-xl
                        p-6
                        text-center
                        cursor-pointer
                    "
                >
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    Take or select receipt photo
                </label>

                {preview && (
                    <img
                        src={preview}
                        alt="Receipt preview"
                        className="
                            w-full
                            max-h-80
                            object-contain
                            rounded-xl
                            mt-4
                        "
                    />
                )}

                <button
                    type="button"
                    disabled={
                        !receipt ||
                        uploading
                    }
                    onClick={handleUpload}
                    className="
                        w-full
                        mt-6
                        bg-mainPrimary
                        text-white
                        py-4
                        rounded-xl
                        font-bold
                        disabled:opacity-50
                    "
                >
                    {uploading
                        ? "Uploading..."
                        : "Upload Receipt"}
                </button>
            </div>
        </div>
    );
}