"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { getKeylessAccount } from "@/lib/keyless";
import { transfer } from "@/lib/aptos";
import { TokenSymbol } from "@/lib/tokens";
import { safeFetch } from "@/lib/fetch-helpers";
import LoadingAnimation from "@/components/LoadingAnimation";
import SuccessAnimation from "@/components/SuccessAnimation";
import TransactionLink from "@/components/TransactionLink";

function ExecutePaymentContent() {
  const [payment, setPayment] = useState<{
    id: string;
    amount: number;
    recipientEmail: string;
    recipientAddress: string | null;
    token: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string>("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("id");

  useEffect(() => {
    if (!paymentId) {
      router.push("/");
      return;
    }

    // Fetch payment details
    const fetchPayment = async () => {
      const result = await safeFetch<{
        id: string;
        amount: number;
        recipientEmail: string;
        recipientAddress: string | null;
        token: string;
        status: string;
        transactionHash: string | null;
      }>(`/api/payments/${paymentId}`);

      if (result.error || !result.data) {
        setError(result.error || "Failed to load payment details");
        setLoading(false);
        return;
      }

      // Check if payment already completed
      if (result.data.status === "claimed" || result.data.transactionHash) {
        setError("This payment has already been completed");
        setLoading(false);
        return;
      }

      setPayment(result.data);
      setLoading(false);
    };

    fetchPayment();
  }, [paymentId, router]);

  const handleExecutePayment = async () => {
    if (!payment || !payment.recipientEmail) {
      setError("Invalid payment details");
      return;
    }

    setExecuting(true);
    setError("");

    try {
      // Get keyless account
      const keylessAccount = await getKeylessAccount();

      if (!keylessAccount) {
        throw new Error("Please sign in again to send payment");
      }

      // Resolve recipient email to address
      const resolveResponse = await fetch("/api/resolve-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: payment.recipientEmail }),
      });

      let resolveData;
      try {
        resolveData = await resolveResponse.json();
      } catch {
        throw new Error("Failed to resolve recipient address");
      }

      if (!resolveResponse.ok) {
        throw new Error(resolveData.error || "Recipient has not registered yet");
      }

      const recipientAddress = resolveData.aptosAddress;

      // Execute transfer
      const transactionHash = await transfer(
        keylessAccount,
        recipientAddress,
        payment.amount,
        (payment.token as TokenSymbol) || "APT"
      );

      // Update payment status
      await fetch(`/api/payments/${paymentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionHash,
          recipientAddress,
        }),
      });

      setTxHash(transactionHash);
    } catch (err) {
      console.error("Payment execution error:", err);
      setError(err instanceof Error ? err.message : "Failed to execute payment");
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <LoadingAnimation message="" size={140} />
          <p className="text-gunmetal/60 mt-4">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error && !payment) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gunmetal mb-3">Error</h1>
          <p className="text-gunmetal/60 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="inline-block px-6 py-3 bg-gunmetal text-white rounded-xl font-semibold hover:bg-gunmetal/90"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (txHash) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Image
              src="/aptfy.png"
              alt="Aptfy Logo"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
            <span className="text-2xl font-semibold text-gunmetal">aptfy</span>
          </div>

          <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
            {/* Success Animation */}
            <div className="flex flex-col items-center mb-6">
              <SuccessAnimation message="" size={140} />
              <h1 className="text-2xl font-bold text-gunmetal mt-4 mb-2">Payment Sent!</h1>
              <p className="text-gunmetal/60 text-center">
                You successfully paid <span className="font-semibold">{payment?.amount} {payment?.token || "APT"}</span> to <span className="font-semibold">{payment?.recipientEmail}</span>
              </p>
            </div>

            {/* Transaction Link */}
            <div className="bg-teal/5 border-2 border-teal/30 rounded-xl p-4 mb-6">
              <p className="text-xs text-gunmetal/60 uppercase tracking-wide mb-2">Transaction Hash</p>
              <TransactionLink txHash={txHash} network="testnet" />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="py-3 px-4 bg-gunmetal text-white rounded-xl font-semibold hover:bg-gunmetal/90 transition-all"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push("/")}
                className="py-3 px-4 bg-white border-2 border-lavender-web text-gunmetal rounded-xl font-semibold hover:bg-lavender-web/30 transition-all"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Payment confirmation state
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image
            src="/aptfy.png"
            alt="Aptfy Logo"
            width={32}
            height={32}
            className="h-8 w-8"
            priority
          />
          <span className="text-2xl font-semibold text-gunmetal">aptfy</span>
        </div>

        <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
          {/* Payment Details */}
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-gunmetal/60 mb-2">Confirm payment</p>
            <div className="flex items-center justify-center gap-3 mb-2">
              <Image
                src={payment?.token === 'USDC' ? "/usd-coin-usdc-logo.svg" : "/aptos-apt-logo.svg"}
                alt={payment?.token || "APT"}
                width={48}
                height={48}
                className="w-12 h-12"
              />
              <span className="text-5xl font-bold text-gunmetal">{payment?.amount}</span>
              <span className="text-2xl font-semibold text-gunmetal/60">{payment?.token || "APT"}</span>
            </div>
            <p className="text-sm text-gunmetal/60">
              to <span className="font-medium text-gunmetal">{payment?.recipientEmail}</span>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {/* Execute Button */}
          {executing ? (
            <div className="flex flex-col items-center py-8">
              <LoadingAnimation message="" size={120} />
              <p className="text-gunmetal/60 mt-4">Processing payment...</p>
            </div>
          ) : (
            <>
              <button
                onClick={handleExecutePayment}
                disabled={executing}
                className="w-full py-4 bg-gunmetal text-white rounded-xl font-semibold text-lg hover:bg-gunmetal/90 disabled:opacity-50 transition-all mb-4"
              >
                Confirm & Pay
              </button>

              <button
                onClick={() => router.push("/")}
                className="w-full py-3 bg-white border-2 border-lavender-web text-gunmetal rounded-xl font-semibold hover:bg-lavender-web/30 transition-all"
              >
                Cancel
              </button>
            </>
          )}

          {/* Security Notice */}
          <p className="text-xs text-center text-gunmetal/50 mt-6">
            This transaction will be executed on the Aptos blockchain.
            The funds will be transferred immediately.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ExecutePaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gunmetal/60">Loading...</p>
        </div>
      </div>
    }>
      <ExecutePaymentContent />
    </Suspense>
  );
}
