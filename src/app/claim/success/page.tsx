"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";

function ClaimSuccessContent() {
  const [amount, setAmount] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const amountParam = searchParams.get("amount");
    const emailParam = searchParams.get("email");
    const storedAddress = sessionStorage.getItem("aptos_address");

    if (!amountParam || !emailParam) {
      router.push("/");
      return;
    }

    setAmount(amountParam);
    setEmail(emailParam);
    setAddress(storedAddress || "");
  }, [searchParams, router]);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            You've successfully claimed <span className="font-semibold text-gunmetal">${amount}</span>
          </p>
        </div>

        {/* Account Details Card */}
        <div className="bg-white border-2 border-lavender-web rounded-2xl p-6 mb-6">
          <div className="space-y-4">
            {/* Email */}
            <div>
              <p className="text-sm text-gunmetal/60 mb-1">Account Email</p>
              <p className="text-lg font-medium text-gunmetal">{email}</p>
            </div>

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