"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";

interface Transaction {
  id: string;
  amount: number;
  type: "sent" | "received";
  recipientEmail: string;
  senderAddress: string | null;
  recipientAddress: string | null;
  status: string;
  transactionHash: string | null;
  createdAt: string;
  claimedAt: string | null;
  errorMessage: string | null;
  explorerUrl: string | null;
}

interface TransactionSummary {
  total: number;
  sent: number;
  received: number;
  completed: number;
  pending: number;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const email = sessionStorage.getItem("user_email");
    const address = sessionStorage.getItem("aptos_address");

    if (!email || !address) {
      router.push("/");
      return;
    }

    setUserEmail(email);
    fetchTransactions(address);
  }, [router]);

  const fetchTransactions = async (address: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transactions?address=${encodeURIComponent(address)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch transactions");
      }

      setTransactions(data.transactions);
      setSummary(data.summary);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "claimed":
        return "bg-teal/10 text-teal border-teal/30";
      case "pending":
        return "bg-columbia-blue/30 text-gunmetal border-columbia-blue";
      case "failed":
        return "bg-red-50 text-red-600 border-red-200";
      default:
        return "bg-lavender-web text-gunmetal border-lavender-web";
    }
  };

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
                width={32}
                height={32}
                className="h-8 w-8"
                priority
              />
              <span className="text-2xl font-semibold text-gunmetal" style={{ fontFamily: "'Outfit', sans-serif" }}>
                aptospay
              </span>
            </Link>

            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gunmetal hover:text-teal transition-colors font-medium"
              >
                Dashboard
              </Link>
              {userEmail && (
                <div className="text-right">
                  <p className="text-xs text-gunmetal/60">Signed in as</p>
                  <p className="text-sm font-medium text-gunmetal truncate max-w-[150px]">
                    {userEmail}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gunmetal mb-2">Transaction History</h1>
          <p className="text-gunmetal/60">View all your sent and received payments</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-teal/10 to-teal/5 rounded-lg border border-teal/30">
              <p className="text-xs text-gunmetal/60 mb-1">Total</p>
              <p className="text-2xl font-bold text-teal">{summary.total}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-columbia-blue/20 to-columbia-blue/10 rounded-lg border border-columbia-blue/30">
              <p className="text-xs text-gunmetal/60 mb-1">Sent</p>
              <p className="text-2xl font-bold text-gunmetal">{summary.sent}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-lavender-web/30 to-lavender-web/10 rounded-lg border border-lavender-web">
              <p className="text-xs text-gunmetal/60 mb-1">Received</p>
              <p className="text-2xl font-bold text-gunmetal">{summary.received}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-teal/10 to-teal/5 rounded-lg border border-teal/30">
              <p className="text-xs text-gunmetal/60 mb-1">Completed</p>
              <p className="text-2xl font-bold text-teal">{summary.completed}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-columbia-blue/20 to-columbia-blue/10 rounded-lg border border-columbia-blue/30">
              <p className="text-xs text-gunmetal/60 mb-1">Pending</p>
              <p className="text-2xl font-bold text-gunmetal">{summary.pending}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Transactions List */}
        {!loading && !error && transactions.length === 0 && (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gunmetal/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-xl font-semibold text-gunmetal mb-2">No transactions yet</h3>
            <p className="text-gunmetal/60 mb-6">Start sending or receiving payments to see your history</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-gunmetal text-white rounded-lg font-semibold hover:bg-gunmetal/90 transition-all"
            >
              Send a Payment
            </Link>
          </div>
        )}

        {!loading && !error && transactions.length > 0 && (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-white border-2 border-lavender-web rounded-xl p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Type Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === "sent" ? "bg-columbia-blue/30" : "bg-teal/10"
                    }`}>
                      {tx.type === "sent" ? (
                        <svg className="w-5 h-5 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13l5 5m0 0l5-5m-5 5V6" />
                        </svg>
                      )}
                    </div>

                    {/* Transaction Info */}
                    <div>
                      <p className="font-semibold text-gunmetal">
                        {tx.type === "sent" ? "Sent" : "Received"} {tx.amount.toFixed(4)} APT
                      </p>
                      <p className="text-sm text-gunmetal/60">
                        {tx.type === "sent" ? "To:" : "From:"} {tx.recipientEmail}
                      </p>
                      <p className="text-xs text-gunmetal/40 mt-1">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(tx.status)}`}>
                    {tx.status}
                  </span>
                </div>

                {/* Transaction Hash */}
                {tx.transactionHash && (
                  <div className="mt-3 pt-3 border-t border-lavender-web">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-gunmetal/60">
                          {tx.transactionHash.slice(0, 10)}...{tx.transactionHash.slice(-8)}
                        </code>
                      </div>
                      {tx.explorerUrl && (
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-teal hover:underline font-medium flex items-center gap-1"
                        >
                          View on Explorer
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {tx.errorMessage && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-xs text-red-600">{tx.errorMessage}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
