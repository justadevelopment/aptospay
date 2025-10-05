"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getKeylessAccount } from "@/lib/keyless";
import TransactionLink from "@/components/TransactionLink";
import {
  createVestingStream,
  claimVested,
  cancelStream,
  getStreamsForAddress,
  getRegistryStats,
  calculateVestingProgress,
  formatOctasToAPT as formatVestingOctasToAPT,
  getVestingStatus,
  type VestingStream,
} from "@/lib/vesting";
import {
  createStandardEscrow,
  createTimeLockedEscrow,
  createArbitratedEscrow,
  releaseEscrow,
  cancelEscrow as cancelEscrowV2,
  claimExpiredEscrow,
  getEscrowsForAddress,
  getRegistryStats as getEscrowRegistryStats,
  getEscrowTypeName,
  getEscrowStatus,
  getTimeRemaining,
  formatOctasToAPT as formatEscrowOctasToAPT,
  type EscrowV2,
} from "@/lib/escrow_v2";
import {
  supplyApt,
  withdrawApt,
  borrowApt,
  repayApt,
  getPoolDetails,
  getPositionDetails,
  poolExists,
  positionExists,
  formatHealthFactor,
  formatApr,
  type LendingPoolDetails,
  type UserPosition,
} from "@/lib/p2p_lending";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";

type Tab = "vesting" | "escrow" | "lending";

export default function DeFiPage() {
  const [activeTab, setActiveTab] = useState<Tab>("vesting");
  const [address, setAddress] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const storedAddress = sessionStorage.getItem("aptos_address");
    if (!storedAddress) {
      router.push("/");
      return;
    }
    setAddress(storedAddress);
  }, [router]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-lavender-web">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/aptfy.png"
                alt="Aptfy Logo"
                width={28}
                height={28}
                className="h-7 w-7"
                priority
              />
              <span className="text-xl font-semibold text-gunmetal" style={{ fontFamily: "'Outfit', sans-serif" }}>aptfy</span>
            </Link>

            <Link
              href="/dashboard"
              className="text-sm font-medium text-gunmetal/60 hover:text-gunmetal transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gunmetal mb-3">DeFi Protocols</h1>
          <p className="text-lg text-gunmetal/60">Vesting streams, escrow, and more advanced DeFi features</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-lavender-web">
          <button
            onClick={() => setActiveTab("vesting")}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === "vesting"
                ? "text-teal border-b-2 border-teal"
                : "text-gunmetal/60 hover:text-gunmetal"
            }`}
          >
            Vesting Streams
          </button>
          <button
            onClick={() => setActiveTab("escrow")}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === "escrow"
                ? "text-teal border-b-2 border-teal"
                : "text-gunmetal/60 hover:text-gunmetal"
            }`}
          >
            Escrow
          </button>
          <button
            onClick={() => setActiveTab("lending")}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === "lending"
                ? "text-teal border-b-2 border-teal"
                : "text-gunmetal/60 hover:text-gunmetal"
            }`}
          >
            P2P Lending
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "vesting" && (
          <div className="space-y-8">
            {/* Vesting Stream Creator */}
            <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-teal/10 rounded-xl">
                  <svg className="w-6 h-6 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gunmetal mb-2">Create Vesting Stream</h2>
                  <p className="text-gunmetal/60">Schedule token releases over time with optional cliff periods</p>
                </div>
              </div>

              <VestingStreamForm address={address} />
            </div>

            {/* Active Streams */}
            <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-gunmetal mb-6">Your Vesting Streams</h2>
              <VestingStreamList address={address} />
            </div>

            {/* Vesting Info */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-teal/10 border border-teal rounded-2xl p-6">
                <div className="w-12 h-12 bg-teal rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gunmetal mb-2">Linear Vesting</h3>
                <p className="text-sm text-gunmetal/60">Tokens unlock continuously over time based on a linear schedule</p>
              </div>

              <div className="bg-teal/10 border border-teal rounded-2xl p-6">
                <div className="w-12 h-12 bg-teal rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gunmetal mb-2">Cliff Periods</h3>
                <p className="text-sm text-gunmetal/60">Optional delay before any tokens unlock, perfect for employee vesting</p>
              </div>

              <div className="bg-teal/10 border border-teal rounded-2xl p-6">
                <div className="w-12 h-12 bg-teal rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gunmetal mb-2">Flexible Claims</h3>
                <p className="text-sm text-gunmetal/60">Recipients can claim vested tokens at any time, multiple claims supported</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "escrow" && (
          <div className="space-y-8">
            {/* Escrow Creator */}
            <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-columbia-blue/20 rounded-xl">
                  <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gunmetal mb-2">Create Escrow</h2>
                  <p className="text-gunmetal/60">Lock funds for a recipient with conditional release</p>
                </div>
              </div>

              <EscrowForm address={address} />
            </div>

            {/* Active Escrows */}
            <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-gunmetal mb-6">Your Escrows</h2>
              <EscrowList address={address} />
            </div>

            {/* Escrow Info */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-columbia-blue/10 border border-columbia-blue rounded-2xl p-6">
                <div className="w-12 h-12 bg-columbia-blue rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gunmetal mb-2">Secure Holding</h3>
                <p className="text-sm text-gunmetal/60">Funds locked in smart contract until conditions are met</p>
              </div>

              <div className="bg-columbia-blue/10 border border-columbia-blue rounded-2xl p-6">
                <div className="w-12 h-12 bg-columbia-blue rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gunmetal mb-2">Conditional Release</h3>
                <p className="text-sm text-gunmetal/60">Sender controls when recipient can claim funds</p>
              </div>

              <div className="bg-columbia-blue/10 border border-columbia-blue rounded-2xl p-6">
                <div className="w-12 h-12 bg-columbia-blue rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gunmetal mb-2">Refundable</h3>
                <p className="text-sm text-gunmetal/60">Sender can cancel and recover funds before release</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "lending" && (
          <div className="space-y-8">
            {/* Pool Stats */}
            <LendingPoolStats />

            {/* User Position */}
            <UserPositionCard address={address} />

            {/* Supply/Withdraw Section */}
            <div className="grid md:grid-cols-2 gap-6">
              <SupplyForm address={address} />
              <WithdrawForm address={address} />
            </div>

            {/* Borrow/Repay Section */}
            <div className="grid md:grid-cols-2 gap-6">
              <BorrowForm address={address} />
              <RepayForm address={address} />
            </div>

            {/* Lending Info */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-teal/10 border border-teal rounded-2xl p-6">
                <div className="w-12 h-12 bg-teal rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gunmetal mb-2">Earn Interest</h3>
                <p className="text-sm text-gunmetal/60">Supply APT to the lending pool and earn dynamic interest rates (0-110% APR)</p>
              </div>

              <div className="bg-teal/10 border border-teal rounded-2xl p-6">
                <div className="w-12 h-12 bg-teal rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gunmetal mb-2">Borrow Assets</h3>
                <p className="text-sm text-gunmetal/60">Borrow against your collateral with 75% LTV ratio and maintain health factor above 1.0</p>
              </div>

              <div className="bg-teal/10 border border-teal rounded-2xl p-6">
                <div className="w-12 h-12 bg-teal rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gunmetal mb-2">Safe Liquidations</h3>
                <p className="text-sm text-gunmetal/60">Automated liquidations at 80% threshold protect lenders, liquidators earn 5% bonus</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============ Vesting Stream Components ============

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function VestingStreamForm({ address }: { address: string }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cliffDate, setCliffDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Validate inputs
      if (!recipient.startsWith("0x") || recipient.length !== 66) {
        throw new Error("Invalid recipient address");
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Invalid amount");
      }

      const startTimeUnix = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimeUnix = Math.floor(new Date(endDate).getTime() / 1000);
      const cliffTimeUnix = cliffDate ? Math.floor(new Date(cliffDate).getTime() / 1000) : 0;

      const now = Math.floor(Date.now() / 1000);
      if (startTimeUnix < now) {
        throw new Error("Start time must be in the future");
      }

      if (endTimeUnix <= startTimeUnix) {
        throw new Error("End time must be after start time");
      }

      if (cliffTimeUnix > 0 && (cliffTimeUnix < startTimeUnix || cliffTimeUnix >= endTimeUnix)) {
        throw new Error("Cliff time must be between start and end time");
      }

      // Get keyless account
      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to create a vesting stream");
      }

      // Create vesting stream
      const txHash = await createVestingStream(
        keylessAccount,
        recipient,
        amountNum,
        startTimeUnix,
        endTimeUnix,
        cliffTimeUnix
      );

      setTxHash(txHash);
      setSuccess("Vesting stream created successfully!");

      // Reset form
      setRecipient("");
      setAmount("");
      setStartDate("");
      setEndDate("");
      setCliffDate("");

      // Reload page after 2 seconds to show new stream
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create vesting stream";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gunmetal mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none font-mono text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gunmetal mb-2">
            Total Amount (APT)
          </label>
          <input
            type="number"
            step="0.00000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gunmetal mb-2">
            Start Date
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gunmetal mb-2">
            End Date
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gunmetal mb-2">
            Cliff Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={cliffDate}
            onChange={(e) => setCliffDate(e.target.value)}
            className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
          />
          <p className="text-xs text-gunmetal/60 mt-1">No tokens unlock before this date</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {success && txHash && (
        <div className="p-4 bg-teal/5 border-2 border-teal/30 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-teal/10 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gunmetal mb-2">{success}</p>
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gunmetal/60 uppercase tracking-wide">Transaction Hash</p>
                <TransactionLink txHash={txHash} />
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-teal text-white font-semibold rounded-xl hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Creating Stream..." : "Create Vesting Stream"}
      </button>
    </form>
  );
}

function VestingStreamList({ address }: { address: string }) {
  const [streams, setStreams] = useState<VestingStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    const loadStreams = async () => {
      try {
        const stats = await getRegistryStats();
        const allStreams = await getStreamsForAddress(address, stats.total_streams);
        setStreams(allStreams);
      } catch (error) {
        console.error("Error loading streams:", error);
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      loadStreams();
    }
  }, [address]);

  const handleClaim = async (streamId: number) => {
    try {
      setClaimingId(streamId);
      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to claim");
      }

      await claimVested(keylessAccount, streamId);
      alert("Tokens claimed successfully!");
      window.location.reload();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`Failed to claim: ${errorMessage}`);
    } finally {
      setClaimingId(null);
    }
  };

  const handleCancel = async (streamId: number) => {
    if (!confirm("Are you sure you want to cancel this stream? Unvested tokens will be refunded.")) {
      return;
    }

    try {
      setCancellingId(streamId);
      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to cancel");
      }

      await cancelStream(keylessAccount, streamId);
      alert("Stream cancelled successfully!");
      window.location.reload();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`Failed to cancel: ${errorMessage}`);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gunmetal/60">Loading streams...</p>
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-lavender-web rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gunmetal/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gunmetal/60">No vesting streams yet</p>
        <p className="text-sm text-gunmetal/40 mt-1">Create your first stream above</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {streams.map((stream) => {
        const progress = calculateVestingProgress(stream);
        const status = getVestingStatus(stream);
        const isRecipient = stream.recipient.toLowerCase() === address.toLowerCase();
        const isSender = stream.sender.toLowerCase() === address.toLowerCase();

        return (
          <div key={stream.stream_id} className="border-2 border-lavender-web rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gunmetal">Stream #{stream.stream_id}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    status === "Active" ? "bg-green-100 text-green-700" :
                    status === "Pending" ? "bg-yellow-100 text-yellow-700" :
                    status === "In Cliff" ? "bg-blue-100 text-blue-700" :
                    status === "Completed" ? "bg-gray-100 text-gray-700" :
                    status === "Cancelled" ? "bg-red-100 text-red-700" :
                    "bg-purple-100 text-purple-700"
                  }`}>
                    {status}
                  </span>
                </div>
                <p className="text-sm text-gunmetal/60">
                  {isRecipient && "You are receiving"} {isSender && "You are sending"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-gunmetal">{formatVestingOctasToAPT(stream.total_amount)} APT</p>
                <p className="text-sm text-gunmetal/60">Total Amount</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gunmetal/60">Vesting Progress</span>
                <span className="font-medium text-teal">{progress}%</span>
              </div>
              <div className="w-full bg-lavender-web rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-teal transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-gunmetal/60 mb-1">Sender</p>
                <code className="text-xs font-mono text-gunmetal">
                  {stream.sender.slice(0, 8)}...{stream.sender.slice(-6)}
                </code>
              </div>
              <div>
                <p className="text-gunmetal/60 mb-1">Recipient</p>
                <code className="text-xs font-mono text-gunmetal">
                  {stream.recipient.slice(0, 8)}...{stream.recipient.slice(-6)}
                </code>
              </div>
              <div>
                <p className="text-gunmetal/60 mb-1">Start Time</p>
                <p className="text-gunmetal">{new Date(stream.start_time * 1000).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gunmetal/60 mb-1">End Time</p>
                <p className="text-gunmetal">{new Date(stream.end_time * 1000).toLocaleString()}</p>
              </div>
              {stream.cliff_time > 0 && (
                <div>
                  <p className="text-gunmetal/60 mb-1">Cliff Time</p>
                  <p className="text-gunmetal">{new Date(stream.cliff_time * 1000).toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-gunmetal/60 mb-1">Claimed</p>
                <p className="text-gunmetal font-medium">{formatVestingOctasToAPT(stream.claimed_amount)} APT</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-lavender-web">
              {isRecipient && !stream.cancelled && (
                <button
                  onClick={() => handleClaim(stream.stream_id)}
                  disabled={claimingId === stream.stream_id}
                  className="flex-1 px-4 py-2 bg-teal text-white font-medium rounded-lg hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {claimingId === stream.stream_id ? "Claiming..." : "Claim Vested Tokens"}
                </button>
              )}

              {isSender && !stream.cancelled && (
                <button
                  onClick={() => handleCancel(stream.stream_id)}
                  disabled={cancellingId === stream.stream_id}
                  className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cancellingId === stream.stream_id ? "Cancelling..." : "Cancel Stream"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ Escrow Components ============

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function EscrowForm({ address }: { address: string }) {
  const [escrowType, setEscrowType] = useState<"standard" | "time_locked" | "arbitrated">("standard");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [releaseTime, setReleaseTime] = useState("");
  const [expiryTime, setExpiryTime] = useState("");
  const [arbitrator, setArbitrator] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Validate inputs
      if (!recipient.startsWith("0x") || recipient.length !== 66) {
        throw new Error("Invalid recipient address");
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Invalid amount");
      }

      // Get keyless account
      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to create escrow");
      }

      let txHash: string;

      if (escrowType === "standard") {
        txHash = await createStandardEscrow(keylessAccount, recipient, amountNum, memo);
      } else if (escrowType === "time_locked") {
        if (!releaseTime || !expiryTime) {
          throw new Error("Release time and expiry time are required for time-locked escrow");
        }

        const releaseTimeUnix = Math.floor(new Date(releaseTime).getTime() / 1000);
        const expiryTimeUnix = Math.floor(new Date(expiryTime).getTime() / 1000);

        const now = Math.floor(Date.now() / 1000);
        if (releaseTimeUnix < now) {
          throw new Error("Release time must be in the future");
        }
        if (expiryTimeUnix <= releaseTimeUnix) {
          throw new Error("Expiry time must be after release time");
        }

        txHash = await createTimeLockedEscrow(
          keylessAccount,
          recipient,
          amountNum,
          memo,
          releaseTimeUnix,
          expiryTimeUnix
        );
      } else {
        // arbitrated
        if (!arbitrator || !arbitrator.startsWith("0x") || arbitrator.length !== 66) {
          throw new Error("Valid arbitrator address is required");
        }

        const expiryTimeUnix = expiryTime ? Math.floor(new Date(expiryTime).getTime() / 1000) : 0;
        if (expiryTimeUnix > 0 && expiryTimeUnix <= Math.floor(Date.now() / 1000)) {
          throw new Error("Expiry time must be in the future");
        }

        txHash = await createArbitratedEscrow(
          keylessAccount,
          recipient,
          arbitrator,
          amountNum,
          memo,
          expiryTimeUnix
        );
      }

      setTxHash(txHash);
      setSuccess("Escrow created successfully!");

      // Reset form
      setRecipient("");
      setAmount("");
      setMemo("");
      setReleaseTime("");
      setExpiryTime("");
      setArbitrator("");

      // Reload page after 2 seconds
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create escrow";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Escrow Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gunmetal mb-3">
          Escrow Type
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setEscrowType("standard")}
            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              escrowType === "standard"
                ? "bg-columbia-blue text-gunmetal border-2 border-columbia-blue"
                : "bg-white border-2 border-lavender-web text-gunmetal/60 hover:border-columbia-blue/50"
            }`}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => setEscrowType("time_locked")}
            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              escrowType === "time_locked"
                ? "bg-columbia-blue text-gunmetal border-2 border-columbia-blue"
                : "bg-white border-2 border-lavender-web text-gunmetal/60 hover:border-columbia-blue/50"
            }`}
          >
            Time-Locked
          </button>
          <button
            type="button"
            onClick={() => setEscrowType("arbitrated")}
            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              escrowType === "arbitrated"
                ? "bg-columbia-blue text-gunmetal border-2 border-columbia-blue"
                : "bg-white border-2 border-lavender-web text-gunmetal/60 hover:border-columbia-blue/50"
            }`}
          >
            Arbitrated
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gunmetal mb-2">
            Recipient Address *
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-columbia-blue focus:outline-none font-mono text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gunmetal mb-2">
            Amount (APT) *
          </label>
          <input
            type="number"
            step="0.00000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10"
            className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-columbia-blue focus:outline-none"
            required
          />
        </div>
      </div>

      {/* Conditional fields based on escrow type */}
      {escrowType === "time_locked" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gunmetal mb-2">
              Release Time * (Earliest claim time)
            </label>
            <input
              type="datetime-local"
              value={releaseTime}
              onChange={(e) => setReleaseTime(e.target.value)}
              className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-columbia-blue focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gunmetal mb-2">
              Expiry Time * (Auto-refund after)
            </label>
            <input
              type="datetime-local"
              value={expiryTime}
              onChange={(e) => setExpiryTime(e.target.value)}
              className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-columbia-blue focus:outline-none"
              required
            />
          </div>
        </div>
      )}

      {escrowType === "arbitrated" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gunmetal mb-2">
              Arbitrator Address * (Third-party dispute resolver)
            </label>
            <input
              type="text"
              value={arbitrator}
              onChange={(e) => setArbitrator(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-columbia-blue focus:outline-none font-mono text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gunmetal mb-2">
              Expiry Time (Optional auto-refund deadline)
            </label>
            <input
              type="datetime-local"
              value={expiryTime}
              onChange={(e) => setExpiryTime(e.target.value)}
              className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-columbia-blue focus:outline-none"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gunmetal mb-2">
          Memo (Optional)
        </label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Payment description..."
          maxLength={100}
          className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-columbia-blue focus:outline-none"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {success && txHash && (
        <div className="p-4 bg-teal/5 border-2 border-teal/30 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-teal/10 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gunmetal mb-2">{success}</p>
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gunmetal/60 uppercase tracking-wide">Transaction Hash</p>
                <TransactionLink txHash={txHash} />
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-columbia-blue text-gunmetal font-semibold rounded-xl hover:bg-columbia-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Creating Escrow..." : "Create Escrow"}
      </button>
    </form>
  );
}

function EscrowList({ address }: { address: string }) {
  const [escrows, setEscrows] = useState<EscrowV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasingId, setReleasingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [expiringId, setExpiringId] = useState<number | null>(null);

  useEffect(() => {
    const loadEscrows = async () => {
      try {
        const stats = await getEscrowRegistryStats();
        const allEscrows = await getEscrowsForAddress(address, stats.total_escrows);
        setEscrows(allEscrows);
      } catch (error) {
        console.error("Error loading escrows:", error);
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      loadEscrows();
    }
  }, [address]);

  const handleRelease = async (escrowId: number) => {
    try {
      setReleasingId(escrowId);
      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to release");
      }

      await releaseEscrow(keylessAccount, escrowId);
      alert("Escrow released successfully!");
      window.location.reload();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`Failed to release: ${errorMessage}`);
    } finally {
      setReleasingId(null);
    }
  };

  const handleCancel = async (escrowId: number) => {
    if (!confirm("Are you sure you want to cancel this escrow?")) {
      return;
    }

    try {
      setCancellingId(escrowId);
      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to cancel");
      }

      await cancelEscrowV2(keylessAccount, escrowId);
      alert("Escrow cancelled successfully!");
      window.location.reload();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`Failed to cancel: ${errorMessage}`);
    } finally {
      setCancellingId(null);
    }
  };

  const handleClaimExpired = async (escrowId: number) => {
    try {
      setExpiringId(escrowId);
      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in");
      }

      await claimExpiredEscrow(keylessAccount, escrowId);
      alert("Expired escrow refunded successfully!");
      window.location.reload();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`Failed to claim expired: ${errorMessage}`);
    } finally {
      setExpiringId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-columbia-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gunmetal/60">Loading escrows...</p>
      </div>
    );
  }

  if (escrows.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-lavender-web rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gunmetal/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-gunmetal/60">No escrows yet</p>
        <p className="text-sm text-gunmetal/40 mt-1">Create your first escrow above</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {escrows.map((escrow) => {
        const status = getEscrowStatus(escrow);
        const isRecipient = escrow.recipient.toLowerCase() === address.toLowerCase();
        const isSender = escrow.sender.toLowerCase() === address.toLowerCase();
        const isArbitrator = escrow.arbitrator && escrow.arbitrator.toLowerCase() === address.toLowerCase();

        return (
          <div key={escrow.escrow_id} className="border-2 border-lavender-web rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gunmetal">Escrow #{escrow.escrow_id}</h3>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                    {getEscrowTypeName(escrow.escrow_type)}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    status === "Active" ? "bg-green-100 text-green-700" :
                    status === "Locked" ? "bg-yellow-100 text-yellow-700" :
                    status === "Expired" ? "bg-orange-100 text-orange-700" :
                    status === "Released" ? "bg-blue-100 text-blue-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {status}
                  </span>
                </div>
                <p className="text-sm text-gunmetal/60">
                  {isSender && "You are sender"}
                  {isRecipient && " • You are recipient"}
                  {isArbitrator && " • You are arbitrator"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-gunmetal">{formatEscrowOctasToAPT(escrow.amount)} APT</p>
                <p className="text-sm text-gunmetal/60">Amount</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-gunmetal/60 mb-1">Sender</p>
                <code className="text-xs font-mono text-gunmetal">
                  {escrow.sender.slice(0, 8)}...{escrow.sender.slice(-6)}
                </code>
              </div>
              <div>
                <p className="text-gunmetal/60 mb-1">Recipient</p>
                <code className="text-xs font-mono text-gunmetal">
                  {escrow.recipient.slice(0, 8)}...{escrow.recipient.slice(-6)}
                </code>
              </div>
              {escrow.arbitrator && (
                <div>
                  <p className="text-gunmetal/60 mb-1">Arbitrator</p>
                  <code className="text-xs font-mono text-gunmetal">
                    {escrow.arbitrator.slice(0, 8)}...{escrow.arbitrator.slice(-6)}
                  </code>
                </div>
              )}
              {escrow.release_time > 0 && (
                <div>
                  <p className="text-gunmetal/60 mb-1">Release Time</p>
                  <p className="text-gunmetal">
                    {new Date(escrow.release_time * 1000).toLocaleString()}
                    {escrow.release_time > Math.floor(Date.now() / 1000) && (
                      <span className="ml-2 text-xs text-gunmetal/60">
                        (in {getTimeRemaining(escrow.release_time)})
                      </span>
                    )}
                  </p>
                </div>
              )}
              {escrow.expiry_time > 0 && (
                <div>
                  <p className="text-gunmetal/60 mb-1">Expiry Time</p>
                  <p className="text-gunmetal">
                    {new Date(escrow.expiry_time * 1000).toLocaleString()}
                    {escrow.expiry_time > Math.floor(Date.now() / 1000) && (
                      <span className="ml-2 text-xs text-gunmetal/60">
                        (in {getTimeRemaining(escrow.expiry_time)})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-lavender-web">
              {(isRecipient || isArbitrator) && !escrow.released && !escrow.cancelled && status !== "Expired" && (
                <button
                  onClick={() => handleRelease(escrow.escrow_id)}
                  disabled={releasingId === escrow.escrow_id || (status === "Locked" && !isArbitrator)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {releasingId === escrow.escrow_id ? "Releasing..." :
                   status === "Locked" && !isArbitrator ? `Locked until ${getTimeRemaining(escrow.release_time)}` :
                   "Release to Recipient"}
                </button>
              )}

              {isSender && !escrow.released && !escrow.cancelled && (
                <button
                  onClick={() => handleCancel(escrow.escrow_id)}
                  disabled={cancellingId === escrow.escrow_id}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cancellingId === escrow.escrow_id ? "Cancelling..." : "Cancel & Refund"}
                </button>
              )}

              {status === "Expired" && !escrow.released && !escrow.cancelled && (
                <button
                  onClick={() => handleClaimExpired(escrow.escrow_id)}
                  disabled={expiringId === escrow.escrow_id}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {expiringId === escrow.escrow_id ? "Processing..." : "Claim Expired (Refund to Sender)"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ P2P Lending Components ============

function LendingPoolStats() {
  const [poolData, setPoolData] = useState<LendingPoolDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPoolData = async () => {
      try {
        const exists = await poolExists();
        if (exists) {
          const data = await getPoolDetails();
          setPoolData(data);
        }
      } catch (error) {
        console.error("Error loading pool data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPoolData();
    const interval = setInterval(loadPoolData, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gunmetal/60">Loading pool data...</p>
        </div>
      </div>
    );
  }

  if (!poolData) {
    return (
      <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-lavender-web rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gunmetal/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gunmetal/60">Lending pool not initialized</p>
          <p className="text-sm text-gunmetal/40 mt-1">Contact admin to create the APT lending pool</p>
        </div>
      </div>
    );
  }

  const totalLiquidityAPT = poolData.total_liquidity / 100_000_000;
  const totalBorrowedAPT = poolData.total_borrowed / 100_000_000;
  const availableLiquidity = totalLiquidityAPT - totalBorrowedAPT;
  const utilizationRate = totalLiquidityAPT > 0 ? (totalBorrowedAPT / totalLiquidityAPT) * 100 : 0;

  return (
    <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-teal/10 rounded-xl">
          <svg className="w-6 h-6 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gunmetal mb-2">Lending Pool Statistics</h2>
          <p className="text-gunmetal/60">Real-time pool metrics and interest rates</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <div className="bg-lavender-web/30 rounded-xl p-4">
          <p className="text-sm text-gunmetal/60 mb-1">Total Liquidity</p>
          <p className="text-2xl font-bold text-gunmetal">{totalLiquidityAPT.toFixed(2)} APT</p>
        </div>

        <div className="bg-lavender-web/30 rounded-xl p-4">
          <p className="text-sm text-gunmetal/60 mb-1">Total Borrowed</p>
          <p className="text-2xl font-bold text-gunmetal">{totalBorrowedAPT.toFixed(2)} APT</p>
        </div>

        <div className="bg-lavender-web/30 rounded-xl p-4">
          <p className="text-sm text-gunmetal/60 mb-1">Available</p>
          <p className="text-2xl font-bold text-teal">{availableLiquidity.toFixed(2)} APT</p>
        </div>

        <div className="bg-lavender-web/30 rounded-xl p-4">
          <p className="text-sm text-gunmetal/60 mb-1">Supply APR</p>
          <p className="text-2xl font-bold text-green-600">{formatApr(poolData.current_supply_rate).toFixed(2)}%</p>
        </div>

        <div className="bg-lavender-web/30 rounded-xl p-4">
          <p className="text-sm text-gunmetal/60 mb-1">Borrow APR</p>
          <p className="text-2xl font-bold text-orange-600">{formatApr(poolData.current_borrow_rate).toFixed(2)}%</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gunmetal/60">Utilization Rate</span>
          <span className="font-medium text-teal">{utilizationRate.toFixed(2)}%</span>
        </div>
        <div className="w-full bg-lavender-web rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-500"
            style={{ width: `${utilizationRate}%` }}
          />
        </div>
        <p className="text-xs text-gunmetal/40 mt-2">Optimal utilization: 80%</p>
      </div>
    </div>
  );
}

function UserPositionCard({ address }: { address: string }) {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPosition, setHasPosition] = useState(false);

  useEffect(() => {
    const loadPosition = async () => {
      if (!address) return;

      try {
        const exists = await positionExists(address);
        setHasPosition(exists);

        if (exists) {
          const data = await getPositionDetails(address);
          setPosition(data);
        }
      } catch (error) {
        console.error("Error loading position:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPosition();
    const interval = setInterval(loadPosition, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [address]);

  if (loading) {
    return (
      <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gunmetal/60">Loading your position...</p>
        </div>
      </div>
    );
  }

  if (!hasPosition || !position) {
    return (
      <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-lavender-web rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gunmetal/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gunmetal/60">No active position</p>
          <p className="text-sm text-gunmetal/40 mt-1">Supply or borrow to get started</p>
        </div>
      </div>
    );
  }

  const suppliedAPT = position.supplied_amount / 100_000_000;
  const borrowedAPT = position.borrowed_amount / 100_000_000;
  const collateralAPT = position.collateral_amount / 100_000_000;
  const healthFactor = formatHealthFactor(position.health_factor);
  const isAtRisk = healthFactor < 1.25 && borrowedAPT > 0;

  return (
    <div className={`bg-white border-2 rounded-2xl p-8 ${isAtRisk ? 'border-red-400' : 'border-lavender-web'}`}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal/10 rounded-xl">
            <svg className="w-6 h-6 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gunmetal mb-2">Your Position</h2>
            <p className="text-gunmetal/60">Current lending and borrowing status</p>
          </div>
        </div>

        {borrowedAPT > 0 && (
          <div className={`px-4 py-2 rounded-xl ${
            healthFactor >= 1.5 ? 'bg-green-100 text-green-700' :
            healthFactor >= 1.25 ? 'bg-yellow-100 text-yellow-700' :
            healthFactor >= 1.0 ? 'bg-orange-100 text-orange-700' :
            'bg-red-100 text-red-700'
          }`}>
            <p className="text-xs font-medium mb-1">Health Factor</p>
            <p className="text-2xl font-bold">{healthFactor.toFixed(3)}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-900/60 mb-1">Supplied</p>
          <p className="text-2xl font-bold text-green-900">{suppliedAPT.toFixed(4)} APT</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm text-orange-900/60 mb-1">Borrowed</p>
          <p className="text-2xl font-bold text-orange-900">{borrowedAPT.toFixed(4)} APT</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900/60 mb-1">Collateral</p>
          <p className="text-2xl font-bold text-blue-900">{collateralAPT.toFixed(4)} APT</p>
        </div>
      </div>

      {isAtRisk && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold text-red-900 mb-1">Liquidation Risk</p>
              <p className="text-sm text-red-800">Your health factor is low. Repay debt or add collateral to avoid liquidation.</p>
            </div>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-lavender-web">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gunmetal/60">Position Status</span>
          <span className={`font-medium ${
            borrowedAPT === 0 && suppliedAPT > 0 ? 'text-green-600' :
            healthFactor >= 1.25 ? 'text-teal' :
            'text-orange-600'
          }`}>
            {borrowedAPT === 0 && suppliedAPT > 0 ? 'Supplying Only' :
             borrowedAPT > 0 ? 'Borrowing Active' : 'Active'}
          </span>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SupplyForm({ address }: { address: string }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Invalid amount");
      }

      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to supply");
      }

      const txHash = await supplyApt(keylessAccount, amountNum);
      setTxHash(txHash);
      setSuccess(`Successfully supplied ${amountNum} APT!`);
      setAmount("");

      setTimeout(() => window.location.reload(), 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to supply";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-green-100 rounded-xl">
          <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gunmetal mb-1">Supply APT</h3>
          <p className="text-sm text-gunmetal/60">Earn interest on your supplied assets</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gunmetal mb-2">
            Amount (APT)
          </label>
          <input
            type="number"
            step="0.00000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10.0"
            className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
            required
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Supplying..." : "Supply APT"}
        </button>
      </form>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function WithdrawForm({ address }: { address: string }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Invalid amount");
      }

      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to withdraw");
      }

      const txHash = await withdrawApt(keylessAccount, amountNum);
      setTxHash(txHash);
      setSuccess(`Successfully withdrawn ${amountNum} APT!`);
      setAmount("");

      setTimeout(() => window.location.reload(), 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to withdraw";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-blue-100 rounded-xl">
          <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gunmetal mb-1">Withdraw APT</h3>
          <p className="text-sm text-gunmetal/60">Withdraw your supplied assets</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gunmetal mb-2">
            Amount (APT)
          </label>
          <input
            type="number"
            step="0.00000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10.0"
            className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
            required
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Withdrawing..." : "Withdraw APT"}
        </button>
      </form>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BorrowForm({ address }: { address: string }) {
  const [collateralAmount, setCollateralAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const collateralNum = parseFloat(collateralAmount);
      const borrowNum = parseFloat(borrowAmount);

      if (isNaN(collateralNum) || collateralNum <= 0) {
        throw new Error("Invalid collateral amount");
      }

      if (isNaN(borrowNum) || borrowNum <= 0) {
        throw new Error("Invalid borrow amount");
      }

      // Check LTV ratio (75% max)
      if (borrowNum > collateralNum * 0.75) {
        throw new Error("Borrow amount exceeds 75% LTV ratio. Maximum borrow: " + (collateralNum * 0.75).toFixed(4) + " APT");
      }

      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to borrow");
      }

      const txHash = await borrowApt(keylessAccount, collateralNum, borrowNum);
      setTxHash(txHash);
      setSuccess(`Successfully borrowed ${borrowNum} APT!`);
      setCollateralAmount("");
      setBorrowAmount("");

      setTimeout(() => window.location.reload(), 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to borrow";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateMaxBorrow = () => {
    const collateralNum = parseFloat(collateralAmount);
    if (!isNaN(collateralNum) && collateralNum > 0) {
      const maxBorrow = collateralNum * 0.75;
      setBorrowAmount(maxBorrow.toFixed(4));
    }
  };

  return (
    <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-orange-100 rounded-xl">
          <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gunmetal mb-1">Borrow APT</h3>
          <p className="text-sm text-gunmetal/60">Borrow against collateral (75% LTV max)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gunmetal mb-2">
            Collateral Amount (APT)
          </label>
          <input
            type="number"
            step="0.00000001"
            value={collateralAmount}
            onChange={(e) => setCollateralAmount(e.target.value)}
            placeholder="100.0"
            className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gunmetal">
              Borrow Amount (APT)
            </label>
            <button
              type="button"
              onClick={calculateMaxBorrow}
              className="text-xs text-teal hover:underline"
            >
              Max (75%)
            </button>
          </div>
          <input
            type="number"
            step="0.00000001"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            placeholder="75.0"
            className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
            required
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Borrowing..." : "Borrow APT"}
        </button>
      </form>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function RepayForm({ address }: { address: string }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Invalid amount");
      }

      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to repay");
      }

      const txHash = await repayApt(keylessAccount, amountNum);
      setTxHash(txHash);
      setSuccess(`Successfully repaid ${amountNum} APT!`);
      setAmount("");

      setTimeout(() => window.location.reload(), 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to repay";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-purple-100 rounded-xl">
          <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gunmetal mb-1">Repay APT</h3>
          <p className="text-sm text-gunmetal/60">Repay your borrowed assets</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gunmetal mb-2">
            Repay Amount (APT)
          </label>
          <input
            type="number"
            step="0.00000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10.0"
            className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
            required
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Repaying..." : "Repay Debt"}
        </button>
      </form>
    </div>
  );
}
