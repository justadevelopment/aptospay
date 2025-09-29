"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ClaimSuccessPage() {
  const [amount, setAmount] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [address, setAddress] = useState<string>("");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✓</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Claimed!
          </h1>

          <p className="text-gray-600 mb-6">
            You&apos;ve successfully received <span className="font-bold text-green-600">${amount}</span>
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Email:</span> {email}
            </p>
            {address && (
              <p className="text-sm text-gray-600 break-all">
                <span className="font-medium">Wallet Address:</span>
                <br />
                <code className="text-xs">{address}</code>
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              View Dashboard
            </Link>

            <Link
              href="/"
              className="block w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Create New Payment
            </Link>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            Your Aptos account was created automatically using Keyless authentication
          </p>
        </div>
      </div>
    </div>
  );
}