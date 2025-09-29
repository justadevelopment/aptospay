"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { generateEphemeralKeyPair, storeEphemeralKeyPair, createGoogleAuthUrl } from "@/lib/keyless";

export default function PaymentClaimPage({
  params
}: {
  params: Promise<{ params: string[] }>
}) {
  const [amount, setAmount] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const parseParams = async () => {
      const resolvedParams = await params;
      const pathParams = resolvedParams.params;

      if (pathParams.length >= 3) {
        const amountStr = pathParams[0].replace("$", "");
        const recipientEmail = pathParams[2];

        setAmount(amountStr);
        setRecipient(recipientEmail);
      }

      setLoading(false);
    };

    parseParams();
  }, [params]);

  const handleClaimPayment = () => {
    setRedirecting(true);

    const ephemeralKeyPair = generateEphemeralKeyPair();
    const nonce = storeEphemeralKeyPair(ephemeralKeyPair);

    sessionStorage.setItem("payment_amount", amount);
    sessionStorage.setItem("payment_recipient", recipient);

    const authUrl = createGoogleAuthUrl(nonce);
    window.location.href = authUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading payment details...</div>
      </div>
    );
  }

  if (!amount || !recipient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Invalid payment link</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6">
          Claim Your Payment
        </h1>

        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">You&apos;re receiving</p>
          <p className="text-4xl font-bold text-green-600">${amount}</p>
          <p className="text-sm text-gray-600 mt-2">to {recipient}</p>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex items-start space-x-3">
            <span className="text-green-500">✓</span>
            <p className="text-sm text-gray-600">No wallet required</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-green-500">✓</span>
            <p className="text-sm text-gray-600">Sign in with Google</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-green-500">✓</span>
            <p className="text-sm text-gray-600">Instant transfer on Aptos</p>
          </div>
        </div>

        <button
          onClick={handleClaimPayment}
          disabled={redirecting}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {redirecting ? "Redirecting..." : "Claim with Google"}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Powered by Aptos Keyless Accounts
        </p>
      </div>
    </div>
  );
}