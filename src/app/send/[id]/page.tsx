"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";

export default function SendPaymentPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const [payment, setPayment] = useState<{
    id: string;
    amount: number;
    recipientEmail: string;
    recipientAddress: string | null;
    status: string;
    transactionHash: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();
  const [paymentId, setPaymentId] = useState<string>("");

  useEffect(() => {
    const fetchPaymentId = async () => {
      const resolvedParams = await params;
      setPaymentId(resolvedParams.id);
    };
    fetchPaymentId();
  }, [params]);

  useEffect(() => {
    if (!paymentId) return;

    const fetchPayment = async () => {
      try {
        const response = await fetch(`/api/payments/${paymentId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Payment not found");
          setLoading(false);
          return;
        }

        setPayment(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching payment:", err);
        setError("Failed to load payment details");
        setLoading(false);
      }
    };

    fetchPayment();
  }, [paymentId]);

  const executeTransfer = async () => {
    if (!payment) return;

    // Check if user has credentials
    const jwt = sessionStorage.getItem("jwt_token");
    const ephemeralKeyPairStr = sessionStorage.getItem("ephemeral_keypair");

    if (!jwt || !ephemeralKeyPairStr) {
      setError("Please sign in first to execute the transfer");
      router.push("/");
      return;
    }

    setExecuting(true);
    setError("");

    try {
      const response = await fetch("/api/payments/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: payment.id,
          jwt,
          ephemeralKeyPairStr,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute transfer");
      }

      // Redirect to success page
      alert(`Transaction successful! Hash: ${data.transactionHash}`);
      router.push("/dashboard");
    } catch (err) {
      console.error("Execute transfer error:", err);
      setError(err instanceof Error ? err.message : "Failed to execute transfer");
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gunmetal/60">Loading payment details...</p>
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
          <Link href="/" className="inline-block px-6 py-3 bg-gunmetal text-white rounded-xl font-semibold hover:bg-gunmetal/90">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (!payment) {
    return null;
  }

  // If already completed
  if (payment.transactionHash) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gunmetal mb-3">Payment Already Completed</h1>
          <p className="text-gunmetal/60 mb-2">This payment has already been executed.</p>
          <a
            href={`https://explorer.aptoslabs.com/txn/${payment.transactionHash}?network=testnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal hover:underline text-sm font-mono block mb-6"
          >
            View on Explorer
          </a>
          <Link href="/dashboard" className="inline-block px-6 py-3 bg-gunmetal text-white rounded-xl font-semibold hover:bg-gunmetal/90">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // If recipient hasn't claimed yet
  if (!payment.recipientAddress) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-columbia-blue rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gunmetal mb-3">Waiting for Recipient</h1>
          <p className="text-gunmetal/60 mb-6">
            The recipient hasn't claimed this payment yet. Send them the payment link to continue.
          </p>
          <Link href="/dashboard" className="inline-block px-6 py-3 bg-gunmetal text-white rounded-xl font-semibold hover:bg-gunmetal/90">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Ready to execute
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold text-gunmetal text-center mb-8">Execute Payment Transfer</h1>

        {/* Payment Details */}
        <div className="bg-white border-2 border-lavender-web rounded-2xl p-6 mb-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gunmetal/60 mb-1">Amount</p>
              <p className="text-2xl font-bold text-teal">${payment.amount} APT</p>
            </div>

            <div>
              <p className="text-sm text-gunmetal/60 mb-1">Recipient</p>
              <p className="text-lg font-medium text-gunmetal">{payment.recipientEmail}</p>
            </div>

            <div>
              <p className="text-sm text-gunmetal/60 mb-1">Recipient Address</p>
              <code className="text-xs font-mono text-gunmetal bg-lavender-web px-2 py-1 rounded block break-all">
                {payment.recipientAddress}
              </code>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Execute Button */}
        <button
          onClick={executeTransfer}
          disabled={executing}
          className="w-full py-4 bg-gunmetal text-white rounded-xl font-semibold text-lg hover:bg-gunmetal/90 disabled:bg-lavender-web disabled:text-gunmetal/30 transition-all mb-4"
        >
          {executing ? "Executing Transaction..." : "Execute Transfer"}
        </button>

        <Link
          href="/dashboard"
          className="block text-center text-sm text-teal hover:underline"
        >
          Cancel
        </Link>

        {/* Info */}
        <div className="mt-6 p-4 bg-columbia-blue/20 border border-columbia-blue rounded-xl">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-gunmetal font-medium mb-1">Real Blockchain Transaction</p>
              <p className="text-xs text-gunmetal/60">
                This will execute a real APT transfer on the Aptos blockchain. Make sure you have sufficient balance and gas fees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
