"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getBalance } from "@/lib/aptos";
import { formatAmount } from "@/lib/tokens";
import TransactionHistory from "@/components/TransactionHistory";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";

export default function DashboardPage() {
  const [address, setAddress] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [aptBalance, setAptBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
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
        // Fetch both APT and USDC balances in parallel
        const [apt, usdc] = await Promise.all([
          getBalance(storedAddress, 'APT'),
          getBalance(storedAddress, 'USDC')
        ]);
        setAptBalance(apt);
        setUsdcBalance(usdc);
      } catch (error) {
        console.error("Error fetching balances:", error);
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
          <p className="text-gunmetal/60">Loading Dashboard...</p>
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
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/aptospay.png"
                alt="AptosPay Logo"
                width={28}
                height={28}
                className="h-7 w-7"
                priority
              />
              <span className="text-xl font-semibold text-gunmetal" style={{ fontFamily: "'Outfit', sans-serif" }}>aptospay</span>
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
          <p className="text-lg text-gunmetal/60">Manage your account</p>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Balance Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Balances */}
            <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gunmetal">Balances</h2>
                <span className="px-3 py-1 bg-green-50 text-green-600 text-sm font-medium rounded-full">
                  Active
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* APT Balance */}
                <div className="p-6 bg-gradient-to-br from-teal/10 to-teal/5 rounded-xl border-2 border-teal/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gunmetal/60">APT Balance</p>
                    <Image
                      src="/aptos-apt-logo.svg"
                      alt="Aptos"
                      width={32}
                      height={32}
                      className="w-8 h-8 opacity-50"
                    />
                  </div>
                  <span className="text-3xl font-bold text-gunmetal">{formatAmount(aptBalance, 'APT')}</span>
                </div>

                {/* USDC Balance */}
                <div className="p-6 bg-gradient-to-br from-columbia-blue/10 to-columbia-blue/5 rounded-xl border-2 border-columbia-blue/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gunmetal/60">USDC Balance</p>
                    <Image
                      src="/usd-coin-usdc-logo.svg"
                      alt="USDC"
                      width={32}
                      height={32}
                      className="w-8 h-8 opacity-50"
                    />
                  </div>
                  <span className="text-3xl font-bold text-gunmetal">{formatAmount(usdcBalance, 'USDC')}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-gunmetal mb-6">Quick Actions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Link
                  href="/#send"
                  className="group p-6 bg-gradient-to-br from-gunmetal to-gunmetal/90 text-white rounded-xl hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </div>
                    <svg className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Send Payment</h3>
                  <p className="text-sm text-white/70">Send APT or USDC to anyone</p>
                </Link>

                <Link
                  href="/#receive"
                  className="group p-6 bg-gradient-to-br from-teal to-teal/90 text-white rounded-xl hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <svg className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Request Payment</h3>
                  <p className="text-sm text-white/70">Generate payment link or QR</p>
                </Link>

                <Link
                  href="/escrow"
                  className="group p-6 bg-gradient-to-br from-columbia-blue/80 to-columbia-blue/70 text-gunmetal rounded-xl hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] border-2 border-columbia-blue"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-white/40 rounded-lg group-hover:bg-white/60 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <svg className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Escrow Payment</h3>
                  <p className="text-sm text-gunmetal/70">Secure conditional payments</p>
                </Link>

                <Link
                  href="/scan"
                  className="group p-6 bg-white border-2 border-lavender-web text-gunmetal rounded-xl hover:bg-lavender-web/30 hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 bg-lavender-web rounded-lg group-hover:bg-lavender-web/80 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <svg className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Scan QR Code</h3>
                  <p className="text-sm text-gunmetal/60">Pay with QR code scanner</p>
                </Link>
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
          <TransactionHistory address={address} />
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