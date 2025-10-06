"use client";

import { useEffect, useState } from "react";
import LoadingAnimation from "./LoadingAnimation";
import SuccessAnimation from "./SuccessAnimation";
import QRCode from "qrcode";

interface PaymentLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  status: "loading" | "success" | "error";
  paymentLink?: string | null;
  errorMessage?: string;
  amount?: string;
  recipient?: string;
  token?: string;
}

export default function PaymentLinkDialog({
  isOpen,
  onClose,
  status,
  paymentLink,
  errorMessage,
  amount,
  recipient,
  token = "APT"
}: PaymentLinkDialogProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

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

  // Generate QR code when payment link is available
  useEffect(() => {
    if (paymentLink && status === "success") {
      QRCode.toDataURL(paymentLink, {
        width: 300,
        margin: 2,
        color: {
          dark: "#102770",
          light: "#FFFFFF"
        }
      })
        .then(setQrCodeDataUrl)
        .catch(console.error);
    }
  }, [paymentLink, status]);

  const copyToClipboard = async () => {
    if (!paymentLink) return;
    await navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
              <h3 className="text-xl font-semibold text-gunmetal mb-2 mt-4">Creating Payment Link</h3>
              <p className="text-sm text-gunmetal/60 text-center">
                Generating your payment request...
              </p>
            </div>
          )}

          {/* Success State */}
          {status === "success" && paymentLink && (
            <div className="flex flex-col items-center">
              {/* Success Animation */}
              <SuccessAnimation message="" size={120} />

              {/* Success Message */}
              <h3 className="text-xl font-semibold text-gunmetal mb-2 mt-4">Payment Link Created!</h3>
              <p className="text-sm text-gunmetal/60 mb-4 text-center">
                Share this link with <span className="font-medium">{recipient}</span> to request <span className="font-medium">{amount} {token}</span>
              </p>

              {/* QR Code */}
              {qrCodeDataUrl && (
                <div className="mb-6 p-4 bg-white border-2 border-teal/30 rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeDataUrl} alt="Payment QR Code" className="w-full max-w-[250px] mx-auto" />
                  <p className="text-xs text-gunmetal/60 text-center mt-2">Scan to pay</p>
                </div>
              )}

              {/* Payment Link */}
              <div className="w-full bg-teal/5 border-2 border-teal/30 rounded-xl p-4 mb-4">
                <p className="text-xs text-gunmetal/60 uppercase tracking-wide mb-2">Payment Link</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={paymentLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border-2 border-lavender-web rounded-lg text-xs font-mono text-gunmetal truncate"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-gunmetal text-white rounded-lg hover:bg-gunmetal/90 transition-all text-xs font-semibold flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
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
              <h3 className="text-xl font-semibold text-gunmetal mb-2">Failed to Create Link</h3>
              <p className="text-sm text-red-600 mb-6 text-center">
                {errorMessage || "An error occurred while creating the payment link. Please try again."}
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
