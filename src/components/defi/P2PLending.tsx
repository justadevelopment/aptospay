"use client";

import { useState, useEffect } from "react";
import { getKeylessAccount } from "@/lib/keyless";
import TransactionLink from "@/components/TransactionLink";
import {
  supplyApt,
  withdrawApt,
  borrowApt,
  repayApt,
  getPoolDetails,
  formatApr,
  type LendingPoolDetails,
} from "@/lib/p2p_lending";

interface P2PLendingProps {
  address: string;
}

interface UserActionHistory {
  action: "supply" | "withdraw" | "borrow" | "repay";
  amount: number;
  txHash: string;
  timestamp: number;
}

export default function P2PLending({ address }: P2PLendingProps) {
  const [poolData, setPoolData] = useState<LendingPoolDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Track user's actions locally (since contract doesn't expose position data)
  const [userSupplied, setUserSupplied] = useState(0);
  const [userBorrowed, setUserBorrowed] = useState(0);
  const [userCollateral, setUserCollateral] = useState(0);
  const [actionHistory, setActionHistory] = useState<UserActionHistory[]>([]);

  // Form states for each action
  const [supplyAmount, setSupplyAmount] = useState("");
  const [supplyLoading, setSupplyLoading] = useState(false);
  const [supplyError, setSupplyError] = useState("");
  const [supplySuccess, setSupplySuccess] = useState("");
  const [supplyTxHash, setSupplyTxHash] = useState("");

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [withdrawTxHash, setWithdrawTxHash] = useState("");

  const [borrowCollateral, setBorrowCollateral] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [borrowError, setBorrowError] = useState("");
  const [borrowSuccess, setBorrowSuccess] = useState("");
  const [borrowTxHash, setBorrowTxHash] = useState("");

  const [repayAmount, setRepayAmount] = useState("");
  const [repayLoading, setRepayLoading] = useState(false);
  const [repayError, setRepayError] = useState("");
  const [repaySuccess, setRepaySuccess] = useState("");
  const [repayTxHash, setRepayTxHash] = useState("");

  const loadPoolData = async () => {
    try {
      setLoading(true);
      const details = await getPoolDetails();
      setPoolData(details);
    } catch (error) {
      console.error("Error loading pool:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load user's action history from localStorage
  useEffect(() => {
    const historyKey = `lending_history_${address}`;
    const saved = localStorage.getItem(historyKey);
    if (saved) {
      const history: UserActionHistory[] = JSON.parse(saved);
      setActionHistory(history);

      // Calculate current position from history
      let supplied = 0;
      let borrowed = 0;
      const collateral = 0;

      history.forEach(action => {
        if (action.action === "supply") supplied += action.amount;
        if (action.action === "withdraw") supplied -= action.amount;
        if (action.action === "borrow") {
          borrowed += action.amount;
          // Note: borrow includes collateral, but we don't track it separately in history
        }
        if (action.action === "repay") borrowed -= action.amount;
      });

      setUserSupplied(Math.max(0, supplied));
      setUserBorrowed(Math.max(0, borrowed));
      setUserCollateral(collateral);
    }
  }, [address]);

  useEffect(() => {
    loadPoolData();
  }, []);

  const addToHistory = (action: "supply" | "withdraw" | "borrow" | "repay", amount: number, txHash: string) => {
    const newAction: UserActionHistory = {
      action,
      amount,
      txHash,
      timestamp: Date.now(),
    };

    const updated = [newAction, ...actionHistory].slice(0, 20); // Keep last 20 actions
    setActionHistory(updated);

    const historyKey = `lending_history_${address}`;
    localStorage.setItem(historyKey, JSON.stringify(updated));
  };

  const handleSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupplyError("");
    setSupplySuccess("");
    setSupplyLoading(true);

    try {
      const amount = parseFloat(supplyAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to supply");
      }

      const txHash = await supplyApt(keylessAccount, amount);
      setSupplyTxHash(txHash);
      setSupplySuccess(`Successfully supplied ${amount} APT!`);
      setSupplyAmount("");

      // Update local tracking
      setUserSupplied(prev => prev + amount);
      addToHistory("supply", amount, txHash);

      // Reload pool data
      setTimeout(() => loadPoolData(), 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to supply";
      setSupplyError(errorMessage);
    } finally {
      setSupplyLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess("");
    setWithdrawLoading(true);

    try {
      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      if (amount > userSupplied) {
        throw new Error(`Cannot withdraw more than supplied (${userSupplied.toFixed(4)} APT)`);
      }

      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to withdraw");
      }

      const txHash = await withdrawApt(keylessAccount, amount);
      setWithdrawTxHash(txHash);
      setWithdrawSuccess(`Successfully withdrew ${amount} APT!`);
      setWithdrawAmount("");

      // Update local tracking
      setUserSupplied(prev => Math.max(0, prev - amount));
      addToHistory("withdraw", amount, txHash);

      // Reload pool data
      setTimeout(() => loadPoolData(), 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to withdraw";
      setWithdrawError(errorMessage);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    setBorrowError("");
    setBorrowSuccess("");
    setBorrowLoading(true);

    try {
      const collateral = parseFloat(borrowCollateral);
      const amount = parseFloat(borrowAmount);

      if (isNaN(collateral) || collateral <= 0) {
        throw new Error("Invalid collateral amount");
      }

      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid borrow amount");
      }

      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to borrow");
      }

      const txHash = await borrowApt(keylessAccount, collateral, amount);
      setBorrowTxHash(txHash);
      setBorrowSuccess(`Successfully borrowed ${amount} APT with ${collateral} APT collateral!`);
      setBorrowCollateral("");
      setBorrowAmount("");

      // Update local tracking
      setUserBorrowed(prev => prev + amount);
      setUserCollateral(prev => prev + collateral);
      addToHistory("borrow", amount, txHash);

      // Reload pool data
      setTimeout(() => loadPoolData(), 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to borrow";
      setBorrowError(errorMessage);
    } finally {
      setBorrowLoading(false);
    }
  };

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepayError("");
    setRepaySuccess("");
    setRepayLoading(true);

    try {
      const amount = parseFloat(repayAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      if (amount > userBorrowed) {
        throw new Error(`Cannot repay more than borrowed (${userBorrowed.toFixed(4)} APT)`);
      }

      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to repay");
      }

      const txHash = await repayApt(keylessAccount, amount);
      setRepayTxHash(txHash);
      setRepaySuccess(`Successfully repaid ${amount} APT!`);
      setRepayAmount("");

      // Update local tracking
      setUserBorrowed(prev => Math.max(0, prev - amount));
      addToHistory("repay", amount, txHash);

      // Reload pool data
      setTimeout(() => loadPoolData(), 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to repay";
      setRepayError(errorMessage);
    } finally {
      setRepayLoading(false);
    }
  };

  const utilization = poolData && poolData.total_liquidity > 0
    ? (poolData.total_borrowed / poolData.total_liquidity) * 100
    : 0;

  return (
    <div className="space-y-8">
      {/* Pool Overview */}
      <div className="bg-gradient-to-br from-green-50 to-teal/5 border-2 border-green-200 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gunmetal mb-6">APT Lending Pool</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : poolData ? (
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gunmetal/60 mb-1">Total Liquidity</p>
              <p className="text-2xl font-bold text-gunmetal">{(poolData.total_liquidity / 100_000_000).toFixed(2)} APT</p>
            </div>
            <div>
              <p className="text-sm text-gunmetal/60 mb-1">Total Borrowed</p>
              <p className="text-2xl font-bold text-gunmetal">{(poolData.total_borrowed / 100_000_000).toFixed(2)} APT</p>
            </div>
            <div>
              <p className="text-sm text-gunmetal/60 mb-1">Borrow APR</p>
              <p className="text-2xl font-bold text-green-600">{formatApr(poolData.current_borrow_rate).toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-sm text-gunmetal/60 mb-1">Supply APR</p>
              <p className="text-2xl font-bold text-teal">{formatApr(poolData.current_supply_rate).toFixed(2)}%</p>
            </div>
            <div className="md:col-span-4">
              <p className="text-sm text-gunmetal/60 mb-2">Utilization Rate</p>
              <div className="w-full bg-white rounded-full h-3 border border-green-200">
                <div
                  className="bg-gradient-to-r from-green-500 to-teal h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gunmetal/60 mt-1">{utilization.toFixed(1)}%</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-red-600">Pool not found. Please ensure the pool is initialized.</p>
          </div>
        )}
      </div>

      {/* User Position Overview */}
      <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gunmetal mb-6">Your Position</h2>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm text-gunmetal/60 mb-1">Supplied</p>
            <p className="text-2xl font-bold text-green-600">{userSupplied.toFixed(4)} APT</p>
            <p className="text-xs text-gunmetal/60 mt-1">Earning {poolData ? formatApr(poolData.current_supply_rate).toFixed(2) : '0.00'}% APR</p>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <p className="text-sm text-gunmetal/60 mb-1">Borrowed</p>
            <p className="text-2xl font-bold text-orange-600">{userBorrowed.toFixed(4)} APT</p>
            <p className="text-xs text-gunmetal/60 mt-1">Paying {poolData ? formatApr(poolData.current_borrow_rate).toFixed(2) : '0.00'}% APR</p>
          </div>
          <div className="p-4 bg-columbia-blue/20 border border-columbia-blue rounded-xl">
            <p className="text-sm text-gunmetal/60 mb-1">Collateral</p>
            <p className="text-2xl font-bold text-gunmetal">{userCollateral.toFixed(4)} APT</p>
            <p className="text-xs text-gunmetal/60 mt-1">Locked as collateral</p>
          </div>
        </div>

        {/* Action History */}
        {actionHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gunmetal mb-3">Recent Actions</h3>
            <div className="space-y-2">
              {actionHistory.slice(0, 5).map((action, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-lavender-web/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      action.action === "supply" ? "bg-green-100 text-green-700" :
                      action.action === "withdraw" ? "bg-blue-100 text-blue-700" :
                      action.action === "borrow" ? "bg-orange-100 text-orange-700" :
                      "bg-purple-100 text-purple-700"
                    }`}>
                      {action.action.toUpperCase()}
                    </span>
                    <span className="text-sm text-gunmetal">{action.amount.toFixed(4)} APT</span>
                    <span className="text-xs text-gunmetal/60">
                      {new Date(action.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <a
                    href={`https://explorer.aptoslabs.com/txn/${action.txHash}?network=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal hover:underline"
                  >
                    View Tx
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Supply Form */}
      <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
        <h3 className="text-xl font-semibold text-gunmetal mb-4">Supply APT</h3>
        <p className="text-sm text-gunmetal/60 mb-6">Supply APT to earn interest from borrowers</p>

        <form onSubmit={handleSupply} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gunmetal mb-2">
              Amount (APT)
            </label>
            <input
              type="number"
              value={supplyAmount}
              onChange={(e) => setSupplyAmount(e.target.value)}
              placeholder="10.0"
              step="0.01"
              className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
              required
            />
          </div>

          {supplyError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {supplyError}
            </div>
          )}

          {supplySuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-600 text-sm mb-2">{supplySuccess}</p>
              {supplyTxHash && <TransactionLink txHash={supplyTxHash} network="testnet" />}
            </div>
          )}

          <button
            type="submit"
            disabled={supplyLoading}
            className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {supplyLoading ? "Supplying..." : "Supply APT"}
          </button>
        </form>
      </div>

      {/* Withdraw Form */}
      <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
        <h3 className="text-xl font-semibold text-gunmetal mb-4">Withdraw APT</h3>
        <p className="text-sm text-gunmetal/60 mb-6">Withdraw your supplied APT plus earned interest</p>

        <form onSubmit={handleWithdraw} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gunmetal mb-2">
              Amount (APT) - Available: {userSupplied.toFixed(4)} APT
            </label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="10.0"
              step="0.01"
              max={userSupplied}
              className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
              required
            />
          </div>

          {withdrawError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {withdrawError}
            </div>
          )}

          {withdrawSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-600 text-sm mb-2">{withdrawSuccess}</p>
              {withdrawTxHash && <TransactionLink txHash={withdrawTxHash} network="testnet" />}
            </div>
          )}

          <button
            type="submit"
            disabled={withdrawLoading || userSupplied === 0}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {withdrawLoading ? "Withdrawing..." : "Withdraw APT"}
          </button>
        </form>
      </div>

      {/* Borrow Form */}
      <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
        <h3 className="text-xl font-semibold text-gunmetal mb-4">Borrow APT</h3>
        <p className="text-sm text-gunmetal/60 mb-6">Borrow APT by providing collateral (LTV: 75%)</p>

        <form onSubmit={handleBorrow} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gunmetal mb-2">
              Collateral Amount (APT)
            </label>
            <input
              type="number"
              value={borrowCollateral}
              onChange={(e) => setBorrowCollateral(e.target.value)}
              placeholder="10.0"
              step="0.01"
              className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gunmetal mb-2">
              Borrow Amount (APT)
            </label>
            <input
              type="number"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
              placeholder="7.5"
              step="0.01"
              className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
              required
            />
            <p className="text-xs text-gunmetal/60 mt-1">
              Max borrow: {borrowCollateral ? (parseFloat(borrowCollateral) * 0.75).toFixed(2) : '0.00'} APT (75% of collateral)
            </p>
          </div>

          {borrowError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {borrowError}
            </div>
          )}

          {borrowSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-600 text-sm mb-2">{borrowSuccess}</p>
              {borrowTxHash && <TransactionLink txHash={borrowTxHash} network="testnet" />}
            </div>
          )}

          <button
            type="submit"
            disabled={borrowLoading}
            className="w-full px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {borrowLoading ? "Borrowing..." : "Borrow APT"}
          </button>
        </form>
      </div>

      {/* Repay Form */}
      <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
        <h3 className="text-xl font-semibold text-gunmetal mb-4">Repay Loan</h3>
        <p className="text-sm text-gunmetal/60 mb-6">Repay your borrowed APT to unlock collateral</p>

        <form onSubmit={handleRepay} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gunmetal mb-2">
              Amount (APT) - Owed: {userBorrowed.toFixed(4)} APT
            </label>
            <input
              type="number"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              placeholder="10.0"
              step="0.01"
              max={userBorrowed}
              className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
              required
            />
          </div>

          {repayError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {repayError}
            </div>
          )}

          {repaySuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-600 text-sm mb-2">{repaySuccess}</p>
              {repayTxHash && <TransactionLink txHash={repayTxHash} network="testnet" />}
            </div>
          )}

          <button
            type="submit"
            disabled={repayLoading || userBorrowed === 0}
            className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {repayLoading ? "Repaying..." : "Repay APT"}
          </button>
        </form>
      </div>
    </div>
  );
}
