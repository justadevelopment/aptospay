"use client";

import { useEffect } from "react";
import SuccessAnimation from "./SuccessAnimation";
import LoadingAnimation from "./LoadingAnimation";
import TransactionLink from "./TransactionLink";

interface TransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  status: "loading" | "success" | "error";
  txHash?: string | null;
  errorMessage?: string;
  network?: "mainnet" | "testnet" | "devnet";
}

export default function TransactionDialog({
  isOpen,
  onClose,
  status,
  txHash,
  errorMessage,
  network = "testnet"
}: TransactionDialogProps) {
  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gunmetal/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white border-2 border-lavender-web rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Loading State */}
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-8">
              <LoadingAnimation message="" size={140} />
              <h3 className="text-xl font-semibold text-gunmetal mb-2 mt-4">Processing Transaction</h3>
              <p className="text-sm text-gunmetal/60 text-center">
                Please wait while your transaction is being processed on the blockchain...
              </p>
            </div>
          )}

          {/* Success State */}
          {status === "success" && txHash && (
            <div className="flex flex-col items-center">
              {/* Success Animation */}
              <SuccessAnimation message="" size={120} />

              {/* Success Message */}
              <h3 className="text-xl font-semibold text-gunmetal mb-2 mt-4">Transaction Successful!</h3>
              <p className="text-sm text-gunmetal/60 mb-6 text-center">
                Your transaction has been successfully completed and confirmed on the blockchain.
              </p>

              {/* Transaction Link */}
              <div className="w-full bg-teal/5 border-2 border-teal/30 rounded-xl p-4 mb-6">
                <p className="text-xs text-gunmetal/60 uppercase tracking-wide mb-2">Transaction Hash</p>
                <TransactionLink txHash={txHash} network={network} className="text-sm" />
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full py-3 px-6 bg-gunmetal text-white rounded-xl font-semibold hover:bg-gunmetal/90 transition-all"
              >
                Close
              </button>
            </div>
          )}

          {/* Error State */}
          {status === "error" && (
            <div className="flex flex-col items-center">
              {/* Error Icon */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>

              {/* Error Message */}
              <h3 className="text-xl font-semibold text-gunmetal mb-2">Transaction Failed</h3>
              <p className="text-sm text-red-600 mb-6 text-center">
                {errorMessage || "An error occurred while processing your transaction. Please try again."}
              </p>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full py-3 px-6 bg-gunmetal text-white rounded-xl font-semibold hover:bg-gunmetal/90 transition-all"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
