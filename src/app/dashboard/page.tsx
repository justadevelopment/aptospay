"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBalance } from "@/lib/aptos";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";

export default function DashboardPage() {
  const [address, setAddress] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gunmetal/60">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-lavender-web">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AP</span>
              </div>
              <span className="text-xl font-semibold text-gunmetal">AptosPay</span>
            </Link>

            <button
              onClick={() => {
                sessionStorage.clear();
                router.push("/");
              }}
              className="text-sm font-medium text-gunmetal/60 hover:text-gunmetal transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gunmetal mb-3">Dashboard</h1>
          <p className="text-lg text-gunmetal/60">Manage your AptosPay account</p>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Balance Card */}
          <div className="lg:col-span-2">
            <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gunmetal">Balance</h2>
                <span className="px-3 py-1 bg-green-50 text-green-600 text-sm font-medium rounded-full">
                  Active
                </span>
              </div>

              <div className="mb-8">
                <p className="text-sm text-gunmetal/60 mb-2">Available Balance</p>
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-gunmetal">${balance.toFixed(2)}</span>
                  <span className="ml-2 text-xl text-gunmetal/40">USD</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Link
                  href="/"
                  className="py-3 px-6 bg-gunmetal text-white text-center rounded-xl font-semibold hover:bg-gunmetal/90 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
                >
                  Send Payment
                </Link>
                <button
                  className="py-3 px-6 bg-white border-2 border-lavender-web text-gunmetal rounded-xl font-semibold hover:bg-lavender-web/30 transition-all"
                  disabled
                >
                  Request Payment
                </button>
              </div>
            </div>
          </div>

          {/* Account Info Card */}
          <div className="bg-white border-2 border-lavender-web rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gunmetal mb-4">Account Info</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gunmetal/60 mb-1">Email</p>
                <p className="font-medium text-gunmetal truncate">{email || "Not available"}</p>
              </div>

              <div>
                <p className="text-sm text-gunmetal/60 mb-2">Wallet Address</p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 px-3 py-2 bg-lavender-web rounded-lg text-xs font-mono text-gunmetal truncate">
                    {address.slice(0, 8)}...{address.slice(-6)}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="p-2 bg-gunmetal text-white rounded-lg hover:bg-gunmetal/90 transition-colors"
                  >
                    {copied ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-gunmetal/60 mb-1">Network</p>
                <p className="font-medium text-gunmetal">Aptos Testnet</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-gunmetal mb-6">Recent Transactions</h2>

          <div className="text-center py-12">
            <div className="w-16 h-16 bg-lavender-web rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gunmetal/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gunmetal/60 mb-2">No transactions yet</p>
            <p className="text-sm text-gunmetal/40">Your transaction history will appear here</p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-columbia-blue/10 border border-columbia-blue rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-columbia-blue rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gunmetal mb-1">Secure</h3>
            <p className="text-sm text-gunmetal/60">Non-custodial & encrypted</p>
          </div>

          <div className="bg-columbia-blue/10 border border-columbia-blue rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-columbia-blue rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gunmetal mb-1">Fast</h3>
            <p className="text-sm text-gunmetal/60">Sub-second finality</p>
          </div>

          <div className="bg-columbia-blue/10 border border-columbia-blue rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-columbia-blue rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gunmetal mb-1">Low Fees</h3>
            <p className="text-sm text-gunmetal/60">&lt; $0.01 per transaction</p>
          </div>
        </div>
      </main>
    </div>
  );
}