"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";

function WaitingContent() {
  const [payment, setPayment] = useState<{
    amount: number;
    recipientEmail: string;
    senderAddress: string | null;
    status: string;
    transactionHash: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
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
      try {
        const response = await fetch(`/api/payments/${paymentId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Payment not found");
          setLoading(false);
          return;
        }

        setPayment(data);

        // If payment has transaction hash, redirect to success
        if (data.transactionHash) {
          router.push(`/claim/success?id=${paymentId}`);
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching payment:", err);
        setError("Failed to load payment details");
        setLoading(false);
      }
    };

    fetchPayment();

    // Poll for transaction completion every 3 seconds
    const pollInterval = setInterval(() => {
      fetchPayment();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [paymentId, router]);

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

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gunmetal mb-3">Error</h1>
          <p className="text-gunmetal/60 mb-6">{error || "Payment not found"}</p>
          <Link href="/" className="inline-block px-6 py-3 bg-gunmetal text-white rounded-xl font-semibold hover:bg-gunmetal/90">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Waiting Animation */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-columbia-blue rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <svg className="w-10 h-10 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gunmetal mb-3">
            Payment Claimed!
          </h1>

          <p className="text-gunmetal/60 mb-2">
            You&apos;ve successfully registered for <span className="font-semibold text-gunmetal">${payment.amount}</span>
          </p>
          <p className="text-sm text-gunmetal/50">
            Waiting for sender to execute the transfer...
          </p>
        </div>

        {/* Payment Details Card */}
        <div className="bg-white border-2 border-lavender-web rounded-2xl p-6 mb-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gunmetal/60 mb-1">Amount</p>
              <p className="text-2xl font-bold text-teal">${payment.amount}</p>
            </div>

            <div>
              <p className="text-sm text-gunmetal/60 mb-1">Your Email</p>
              <p className="text-lg font-medium text-gunmetal">{payment.recipientEmail}</p>
            </div>

            <div>
              <p className="text-sm text-gunmetal/60 mb-1">Status</p>
              <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                Waiting for Transfer
              </span>
            </div>
          </div>
        </div>

        {/* Info Message */}
        <div className="p-4 bg-columbia-blue/20 border border-columbia-blue rounded-xl">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-gunmetal font-medium mb-1">What happens next?</p>
              <p className="text-xs text-gunmetal/60">
                The sender needs to execute the blockchain transaction to transfer ${payment.amount} APT to your account.
                This page will automatically update when the transaction is complete.
              </p>
            </div>
          </div>
        </div>

        {/* Manual Check */}
        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-teal hover:underline"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WaitingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gunmetal/60">Loading...</p>
        </div>
      </div>
    }>
      <WaitingContent />
    </Suspense>
  );
}
