"use client";

import { useState, useEffect } from "react";
import { getKeylessAccount } from "@/lib/keyless";
import TransactionLink from "@/components/TransactionLink";
import {
  createVestingStream,
  claimVested,
  cancelStream,
  getStreamsForAddress,
  getRegistryStats,
  calculateVestingProgress,
  formatOctasToAPT,
  getVestingStatus,
  type VestingStream,
} from "@/lib/vesting";

interface VestingStreamsProps {
  address: string;
}

export default function VestingStreams({ address }: VestingStreamsProps) {
  const [streams, setStreams] = useState<VestingStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Form state
  const [recipient, setRecipient] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [cliffTime, setCliffTime] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [txHash, setTxHash] = useState("");

  // Action result state
  const [actionResult, setActionResult] = useState<{ streamId: number; action: string; txHash: string; error?: string } | null>(null);

  // Stats state
  const [stats, setStats] = useState({ total_streams: 0, total_completed: 0, total_cancelled: 0, total_volume: 0 });

  const loadStreams = async () => {
    try {
      setLoading(true);
      const registryStats = await getRegistryStats();
      if (registryStats) {
        setStats(registryStats);
        const allStreams = await getStreamsForAddress(address, registryStats.total_streams);
        setStreams(allStreams);
      }
    } catch (error) {
      console.error("Error loading streams:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      loadStreams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormLoading(true);

    try {
      if (!recipient.match(/^0x[a-fA-F0-9]{64}$/)) {
        throw new Error("Invalid recipient address");
      }

      const amount = parseFloat(totalAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      const start = Math.floor(new Date(startTime).getTime() / 1000);
      const end = Math.floor(new Date(endTime).getTime() / 1000);
      const cliff = cliffTime ? Math.floor(new Date(cliffTime).getTime() / 1000) : start;

      if (end <= start) {
        throw new Error("End time must be after start time");
      }

      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to create stream");
      }

      const hash = await createVestingStream(
        keylessAccount,
        recipient,
        amount,
        start,
        end,
        cliff
      );

      setTxHash(hash);
      setFormSuccess(`Successfully created vesting stream!`);
      setRecipient("");
      setTotalAmount("");
      setStartTime("");
      setEndTime("");
      setCliffTime("");

      // Reload streams after 2 seconds
      setTimeout(() => loadStreams(), 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create stream";
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleClaim = async (streamId: number) => {
    try {
      setClaimingId(streamId);
      setActionResult(null);
      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to claim");
      }

      const txHash = await claimVested(keylessAccount, streamId);
      setActionResult({ streamId, action: "claimed", txHash });
      await loadStreams();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setActionResult({ streamId, action: "claim", txHash: "", error: errorMessage });
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
      setActionResult(null);
      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to cancel");
      }

      const txHash = await cancelStream(keylessAccount, streamId);
      setActionResult({ streamId, action: "cancelled", txHash });
      await loadStreams();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setActionResult({ streamId, action: "cancel", txHash: "", error: errorMessage });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="p-4 bg-teal/5 border border-teal/30 rounded-xl">
          <p className="text-xs text-gunmetal/60 mb-1">Total Streams</p>
          <p className="text-2xl font-bold text-teal">{stats.total_streams}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs text-gunmetal/60 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.total_completed}</p>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs text-gunmetal/60 mb-1">Cancelled</p>
          <p className="text-2xl font-bold text-red-600">{stats.total_cancelled}</p>
        </div>
        <div className="p-4 bg-columbia-blue/20 border border-columbia-blue rounded-xl">
          <p className="text-xs text-gunmetal/60 mb-1">Total Volume</p>
          <p className="text-2xl font-bold text-gunmetal">{formatOctasToAPT(stats.total_volume)} APT</p>
        </div>
      </div>

      {/* Create Stream Form */}
      <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gunmetal mb-6">Create Vesting Stream</h2>

        <form onSubmit={handleCreateStream} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gunmetal mb-2">
              Recipient Address *
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
            <label className="block text-sm font-semibold text-gunmetal mb-2">
              Total Amount (APT) *
            </label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="100"
              step="0.01"
              className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gunmetal mb-2">
                Start Time *
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gunmetal mb-2">
                End Time *
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gunmetal mb-2">
              Cliff Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={cliffTime}
              onChange={(e) => setCliffTime(e.target.value)}
              className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
            />
            <p className="text-xs text-gunmetal/60 mt-1">
              No tokens can be claimed before cliff time (defaults to start time)
            </p>
          </div>

          {formError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {formError}
            </div>
          )}

          {formSuccess && txHash && (
            <div className="p-4 bg-teal/5 border-2 border-teal/30 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-teal/10 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gunmetal mb-2">{formSuccess}</p>
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
            disabled={formLoading}
            className="w-full px-6 py-3 bg-teal text-white font-semibold rounded-xl hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {formLoading ? "Creating Stream..." : "Create Vesting Stream"}
          </button>
        </form>
      </div>

      {/* Stream List */}
      <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gunmetal mb-6">Your Streams</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gunmetal/60">Loading streams...</p>
          </div>
        ) : streams.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gunmetal/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gunmetal/60">No vesting streams yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {streams.map((stream) => {
              const progress = calculateVestingProgress(stream);
              const isSender = stream.sender.toLowerCase() === address.toLowerCase();
              const isRecipient = stream.recipient.toLowerCase() === address.toLowerCase();
              const status = getVestingStatus(stream);

              return (
                <div key={stream.stream_id} className="p-6 border-2 border-lavender-web rounded-xl hover:border-teal/30 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gunmetal">
                          {formatOctasToAPT(stream.total_amount)} APT
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          status === "Active" ? "bg-green-100 text-green-700" :
                          status === "Pending" ? "bg-yellow-100 text-yellow-700" :
                          status === "In Cliff" ? "bg-blue-100 text-blue-700" :
                          status === "Completed" ? "bg-teal/10 text-teal" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {status}
                        </span>
                      </div>
                      <p className="text-sm text-gunmetal/60">
                        {isSender ? `To: ${stream.recipient}` : `From: ${stream.sender}`}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gunmetal/60">Vesting Progress</span>
                      <span className="font-semibold text-gunmetal">{progress}%</span>
                    </div>
                    <div className="w-full bg-lavender-web/30 rounded-full h-2">
                      <div
                        className="bg-teal h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gunmetal/60">Total Amount</p>
                      <p className="font-semibold text-gunmetal">{formatOctasToAPT(stream.total_amount)} APT</p>
                    </div>
                    <div>
                      <p className="text-gunmetal/60">Claimed</p>
                      <p className="font-semibold text-gunmetal">{formatOctasToAPT(stream.claimed_amount)} APT</p>
                    </div>
                  </div>

                  {/* Action Result */}
                  {actionResult && actionResult.streamId === stream.stream_id && (
                    <div className={`mb-4 p-4 rounded-xl border-2 ${
                      actionResult.error
                        ? "bg-red-50 border-red-200"
                        : "bg-green-50 border-green-200"
                    }`}>
                      {actionResult.error ? (
                        <p className="text-red-600 text-sm">{actionResult.error}</p>
                      ) : (
                        <div>
                          <p className="text-green-600 text-sm font-medium mb-2">
                            Stream {actionResult.action} successfully!
                          </p>
                          <TransactionLink txHash={actionResult.txHash} network="testnet" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {isRecipient && !stream.cancelled && status === "Active" && (
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
        )}
      </div>
    </div>
  );
}
