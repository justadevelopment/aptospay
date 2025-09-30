"use client";

import { useEffect, useState } from "react";
import { getTransactionHistory } from "@/lib/payments";

interface Transaction {
  id: string;
  amount: number;
  recipientEmail?: string;
  senderAddress?: string;
  status: string;
  createdAt: Date;
  transactionHash?: string;
}

export default function TransactionHistory({ address }: { address: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getTransactionHistory(address);
        setTransactions(history);
      } catch (error) {
        console.error("Error fetching transaction history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [address]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-3 border-teal border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-gunmetal/60 mt-2">Loading transactions...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-lavender-web rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gunmetal/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gunmetal/60 mb-2">No transactions yet</p>
        <p className="text-sm text-gunmetal/40">Your transaction history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div key={tx.id} className="border border-lavender-web rounded-xl p-4 hover:bg-lavender-web/20 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {tx.senderAddress === address ? (
                <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </div>
              ) : (
                <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13l5 5m0 0l5-5m-5 5V6" />
                  </svg>
                </div>
              )}
              <div>
                <p className="font-medium text-gunmetal">
                  {tx.senderAddress === address ? "Sent" : "Received"}
                </p>
                <p className="text-xs text-gunmetal/60">
                  {tx.recipientEmail || "Direct transfer"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gunmetal">
                {tx.senderAddress === address ? "-" : "+"}${tx.amount}
              </p>
              <p className="text-xs text-gunmetal/60">
                {new Date(tx.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          {tx.status === "pending" && (
            <div className="mt-2 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-md inline-block">
              Pending claim
            </div>
          )}
          {tx.transactionHash && (
            <div className="mt-2">
              <a
                href={`https://explorer.aptoslabs.com/txn/${tx.transactionHash}?network=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-teal hover:underline"
              >
                View on explorer →
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}