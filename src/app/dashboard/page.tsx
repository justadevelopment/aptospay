"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBalance } from "@/lib/aptos";

export default function DashboardPage() {
  const [address, setAddress] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadAccountData = async () => {
      const storedAddress = sessionStorage.getItem("aptos_address");
      const storedEmail = sessionStorage.getItem("user_email");

      if (!storedAddress) {
        router.push("/");
        return;
      }

      setAddress(storedAddress);
      setEmail(storedEmail || "");

      try {
        const accountBalance = await getBalance(storedAddress);
        setBalance(accountBalance);
      } catch (error) {
        console.error("Error fetching balance:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAccountData();
  }, [router]);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            AptosPay
          </Link>
          <button
            onClick={() => {
              sessionStorage.clear();
              router.push("/");
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Dashboard</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Account Info</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{email || "Not available"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Wallet Address</p>
                <div className="flex items-center space-x-2">
                  <code className="text-xs break-all flex-1">{address}</code>
                  <button
                    onClick={copyAddress}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Balance</h2>
            <div className="text-3xl font-bold text-green-600">
              ${balance.toFixed(2)}
            </div>
            <p className="text-sm text-gray-600 mt-2">Available balance</p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            How Keyless Accounts Work
          </h3>
          <p className="text-sm text-blue-800">
            Your Aptos account was created using Google authentication. No seed phrase needed!
            You can always access your account by signing in with the same Google account.
          </p>
        </div>

        <div className="flex space-x-4">
          <Link
            href="/"
            className="flex-1 py-3 bg-blue-600 text-white text-center rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Create Payment Link
          </Link>
          <button
            className="flex-1 py-3 bg-gray-200 text-gray-600 rounded-lg font-semibold cursor-not-allowed"
            disabled
          >
            Transaction History (Coming Soon)
          </button>
        </div>
      </main>
    </div>
  );
}