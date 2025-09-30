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

function ClaimSuccessContent() {
  const [payment, setPayment] = useState<{
    amount: number;
    recipientEmail: string;
    transactionHash: string | null;
  } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [copied, setCopied] = useState(false);
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

    // Fetch REAL payment details from database
    const fetchPayment = async () => {
      try {
        const response = await fetch(`/api/payments/${paymentId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Payment not found");
          setLoading(false);
          return;
        }

        // Verify transaction actually completed
        if (!data.transactionHash) {
          router.push(`/claim/waiting?id=${paymentId}`);
          return;
        }

        setPayment(data);
        setAddress(sessionStorage.getItem("aptos_address") || "");
        setLoading(false);
      } catch (err) {
        console.error("Error fetching payment:", err);
        setError("Failed to load payment details");
        setLoading(false);
      }
    };

    fetchPayment();
  }, [paymentId, router]);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-fadeIn">
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gunmetal mb-3">
            Payment Received!
          </h1>

          <p className="text-gunmetal/60">
            You&apos;ve successfully claimed <span className="font-semibold text-gunmetal">${payment.amount}</span>
          </p>
        </div>

        {/* Account Details Card */}
        <div className="bg-white border-2 border-lavender-web rounded-2xl p-6 mb-6">
          <div className="space-y-4">
            {/* Email */}
            <div>
              <p className="text-sm text-gunmetal/60 mb-1">Account Email</p>
              <p className="text-lg font-medium text-gunmetal">{payment.recipientEmail}</p>
            </div>

            {/* Transaction Hash */}
            {payment.transactionHash && (
              <div>
                <p className="text-sm text-gunmetal/60 mb-2">Transaction Hash</p>
                <a
                  href={`https://explorer.aptoslabs.com/txn/${payment.transactionHash}?network=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal hover:underline font-mono text-sm break-all"
                >
                  {payment.transactionHash.slice(0, 16)}...{payment.transactionHash.slice(-8)}
                </a>
              </div>
            )}

            {/* Wallet Address */}
            {address && (
              <div>
                <p className="text-sm text-gunmetal/60 mb-2">Wallet Address</p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 px-3 py-2 bg-lavender-web rounded-lg text-sm font-mono text-gunmetal break-all">
                    {address.slice(0, 8)}...{address.slice(-6)}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="px-3 py-2 bg-gunmetal text-white rounded-lg hover:bg-gunmetal/90 transition-colors"
                  >
                    {copied ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full py-3 bg-gunmetal text-white text-center rounded-xl font-semibold hover:bg-gunmetal/90 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
          >
            Go to Dashboard
          </Link>

          <Link
            href="/"
            className="block w-full py-3 bg-white border-2 border-lavender-web text-gunmetal text-center rounded-xl font-semibold hover:bg-lavender-web/30 transition-all"
          >
            Create New Payment
          </Link>
        </div>

        {/* Info Message */}
        <div className="mt-8 p-4 bg-columbia-blue/20 border border-columbia-blue rounded-xl">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-gunmetal font-medium mb-1">Your account is ready</p>
              <p className="text-xs text-gunmetal/60">
                You can now send and receive payments using just your email. Your Aptos account was created automatically using Keyless authentication.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClaimSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gunmetal/60">Loading...</p>
        </div>
      </div>
    }>
      <ClaimSuccessContent />
    </Suspense>
  );
}