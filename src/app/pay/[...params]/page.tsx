"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { generateEphemeralKeyPair, storeEphemeralKeyPair, createGoogleAuthUrl } from "@/lib/keyless";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";

export default function PaymentClaimPage({
  params
}: {
  params: Promise<{ params: string[] }>
}) {
  const [amount, setAmount] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [paymentId, setPaymentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const parseParams = async () => {
      const resolvedParams = await params;
      const pathParams = resolvedParams.params;

      if (pathParams.length >= 3) {
        const amountStr = pathParams[0].replace("$", "");
        const recipientEmail = pathParams[2];

        setAmount(amountStr);
        setRecipient(recipientEmail);

        // Get payment ID from query params
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get("id");

        if (id) {
          setPaymentId(id);
        } else {
          setError("Payment ID not found. This link may be invalid.");
        }
      }

      setLoading(false);
    };

    parseParams();
  }, [params]);

  const handleClaimPayment = () => {
    if (!paymentId) {
      setError("Cannot claim payment without payment ID");
      return;
    }

    setRedirecting(true);

    const ephemeralKeyPair = generateEphemeralKeyPair();
    const nonce = storeEphemeralKeyPair(ephemeralKeyPair);

    // Store payment ID (NOT amount) - amount comes from database
    sessionStorage.setItem("payment_id", paymentId);

    const authUrl = createGoogleAuthUrl(nonce);
    window.location.href = authUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gunmetal/60">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!amount || !recipient) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gunmetal mb-2">Invalid payment link</h2>
          <p className="text-gunmetal/60">This payment link appears to be broken or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image
            src="/aptospay.png"
            alt="AptosPay Logo"
            width={32}
            height={32}
            className="h-8 w-8"
            priority
          />
          <span className="text-2xl font-semibold text-gunmetal" style={{ fontFamily: "'Outfit', sans-serif" }}>aptospay</span>
        </div>

        {/* Payment Card */}
        <div className="bg-white border-2 border-lavender-web rounded-2xl p-8 shadow-sm">
          {/* Payment Amount Display */}
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-gunmetal/60 mb-2">You&apos;re receiving</p>
            <div className="flex items-center justify-center">
              <span className="text-5xl font-bold text-gunmetal">${amount}</span>
            </div>
            <p className="text-sm text-gunmetal/60 mt-3">
              to <span className="font-medium text-gunmetal">{recipient}</span>
            </p>
          </div>

          {/* Benefits List */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-columbia-blue rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-gunmetal font-medium">No wallet needed</p>
                <p className="text-sm text-gunmetal/60">Sign in with your Google account</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-columbia-blue rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-gunmetal font-medium">Instant transfer</p>
                <p className="text-sm text-gunmetal/60">Funds available immediately</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-columbia-blue rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-gunmetal font-medium">Secure & non-custodial</p>
                <p className="text-sm text-gunmetal/60">Powered by Aptos blockchain</p>
              </div>
            </div>
          </div>

          {/* Claim Button */}
          <button
            onClick={handleClaimPayment}
            disabled={redirecting}
            className="w-full py-4 bg-gunmetal text-white rounded-xl font-semibold text-lg hover:bg-gunmetal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-3"
          >
            {redirecting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Security Notice */}
          <p className="text-xs text-center text-gunmetal/50 mt-6">
            your account will be created using aptos keyless technology.
            no seed phrases or wallet apps required.
          </p>
        </div>

        {/* Help Link */}
        <div className="text-center mt-6">
          <a href="/help" className="text-sm text-gunmetal/60 hover:text-teal transition-colors">
            Need help? Learn how this works →
          </a>
        </div>
      </div>
    </div>
  );
}