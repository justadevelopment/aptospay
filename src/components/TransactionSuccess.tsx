"use client";

import TransactionLink from "./TransactionLink";

interface TransactionSuccessProps {
  message: string;
  txHash: string;
  network?: "mainnet" | "testnet" | "devnet";
  onClose?: () => void;
}

export default function TransactionSuccess({
  message,
  txHash,
  network = "testnet",
  onClose
}: TransactionSuccessProps) {
  return (
    <div className="bg-white border-2 border-teal rounded-xl p-6 shadow-lg">
      <div className="flex items-start gap-4">
        {/* Success Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="flex-1">
          {/* Message */}
          <h3 className="text-lg font-semibold text-gunmetal mb-2">{message}</h3>

          {/* Transaction Link */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gunmetal/60 uppercase tracking-wide">Transaction Hash</p>
            <TransactionLink txHash={txHash} network={network} />
          </div>
        </div>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gunmetal/40 hover:text-gunmetal transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
