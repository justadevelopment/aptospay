"use client";

import { useState, useEffect } from "react";
import { getKeylessAccount } from "@/lib/keyless";
import TransactionLink from "@/components/TransactionLink";
import {
  createStandardEscrow,
  createTimeLockedEscrow,
  createArbitratedEscrow,
  releaseEscrow,
  cancelEscrow as cancelEscrowV2,
  claimExpiredEscrow,
  getEscrowsForAddress,
  getRegistryStats,
  getEscrowTypeName,
  getEscrowStatus,
  getTimeRemaining,
  formatOctasToAPT,
  type EscrowV2,
} from "@/lib/escrow_v2";

interface EscrowV2Props {
  address: string;
}

export default function EscrowV2Component({ address }: EscrowV2Props) {
  const [escrows, setEscrows] = useState<EscrowV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasingId, setReleasingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [expiringId, setExpiringId] = useState<number | null>(null);

  // Form state
  const [escrowType, setEscrowType] = useState<"standard" | "time_locked" | "arbitrated">("standard");
  const [recipient, setRecipient] = useState("");
  const [arbitrator, setArbitrator] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [releaseTime, setReleaseTime] = useState("");
  const [expiryTime, setExpiryTime] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [txHash, setTxHash] = useState("");

  // Action result state
  const [actionResult, setActionResult] = useState<{ escrowId: number; action: string; txHash: string; error?: string } | null>(null);

  // Stats state
  const [stats, setStats] = useState({
    total_escrows: 0,
    total_released: 0,
    total_cancelled: 0,
    total_expired: 0,
    total_standard: 0,
    total_time_locked: 0,
    total_arbitrated: 0,
    total_volume: 0
  });

  const loadEscrows = async () => {
    try {
      setLoading(true);
      const registryStats = await getRegistryStats();
      if (registryStats) {
        setStats(registryStats);
        const allEscrows = await getEscrowsForAddress(address, registryStats.total_escrows);
        setEscrows(allEscrows);
      }
    } catch (error) {
      console.error("Error loading escrows:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      loadEscrows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormLoading(true);

    try {
      if (!recipient.match(/^0x[a-fA-F0-9]{64}$/)) {
        throw new Error("Invalid recipient address");
      }

      if (escrowType === "arbitrated" && !arbitrator.match(/^0x[a-fA-F0-9]{64}$/)) {
        throw new Error("Invalid arbitrator address");
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Invalid amount");
      }

      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to create escrow");
      }

      let hash: string;

      if (escrowType === "standard") {
        hash = await createStandardEscrow(
          keylessAccount,
          recipient,
          amountNum,
          memo || undefined
        );
      } else if (escrowType === "time_locked") {
        if (!expiryTime) {
          throw new Error("Expiry time is required for time-locked escrow");
        }

        const release = Math.floor(new Date(releaseTime).getTime() / 1000);
        const expiry = Math.floor(new Date(expiryTime).getTime() / 1000);

        if (expiry <= release) {
          throw new Error("Expiry time must be after release time");
        }

        hash = await createTimeLockedEscrow(
          keylessAccount,
          recipient,
          amountNum,
          memo || "",
          release,
          expiry
        );
      } else {
        // arbitrated
        const expiry = expiryTime ? Math.floor(new Date(expiryTime).getTime() / 1000) : undefined;

        hash = await createArbitratedEscrow(
          keylessAccount,
          recipient,
          arbitrator,
          amountNum,
          memo || undefined,
          expiry
        );
      }

      setTxHash(hash);
      setFormSuccess(`Successfully created ${escrowType.replace('_', ' ')} escrow!`);
      setRecipient("");
      setArbitrator("");
      setAmount("");
      setMemo("");
      setReleaseTime("");
      setExpiryTime("");

      // Reload escrows after 2 seconds
      setTimeout(() => loadEscrows(), 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create escrow";
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleRelease = async (escrowId: number) => {
    try {
      setReleasingId(escrowId);
      setActionResult(null);
      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to release");
      }

      const txHash = await releaseEscrow(keylessAccount, escrowId);
      setActionResult({ escrowId, action: "released", txHash });
      await loadEscrows();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setActionResult({ escrowId, action: "release", txHash: "", error: errorMessage });
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
      setActionResult(null);
      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in to cancel");
      }

      const txHash = await cancelEscrowV2(keylessAccount, escrowId);
      setActionResult({ escrowId, action: "cancelled", txHash });
      await loadEscrows();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setActionResult({ escrowId, action: "cancel", txHash: "", error: errorMessage });
    } finally {
      setCancellingId(null);
    }
  };

  const handleClaimExpired = async (escrowId: number) => {
    try {
      setExpiringId(escrowId);
      setActionResult(null);
      const keylessAccount = await getKeylessAccount();
      if (!keylessAccount) {
        throw new Error("Please sign in");
      }

      const txHash = await claimExpiredEscrow(keylessAccount, escrowId);
      setActionResult({ escrowId, action: "refunded (expired)", txHash });
      await loadEscrows();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setActionResult({ escrowId, action: "claim expired", txHash: "", error: errorMessage });
    } finally {
      setExpiringId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="p-4 bg-columbia-blue/20 border border-columbia-blue rounded-xl">
          <p className="text-xs text-gunmetal/60 mb-1">Total Escrows</p>
          <p className="text-2xl font-bold text-gunmetal">{stats.total_escrows}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs text-gunmetal/60 mb-1">Released</p>
          <p className="text-2xl font-bold text-green-600">{stats.total_released}</p>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs text-gunmetal/60 mb-1">Cancelled</p>
          <p className="text-2xl font-bold text-red-600">{stats.total_cancelled}</p>
        </div>
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <p className="text-xs text-gunmetal/60 mb-1">Expired</p>
          <p className="text-2xl font-bold text-orange-600">{stats.total_expired}</p>
        </div>
      </div>

      {/* Create Escrow Form */}
      <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gunmetal mb-6">Create Escrow</h2>

        {/* Escrow Type Selector */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <button
            type="button"
            onClick={() => setEscrowType("standard")}
            className={`p-4 rounded-xl border-2 transition-all ${
              escrowType === "standard"
                ? "border-teal bg-teal/5"
                : "border-lavender-web hover:border-teal/30"
            }`}
          >
            <h3 className="font-semibold text-gunmetal mb-1">Standard</h3>
            <p className="text-xs text-gunmetal/60">Basic escrow</p>
          </button>
          <button
            type="button"
            onClick={() => setEscrowType("time_locked")}
            className={`p-4 rounded-xl border-2 transition-all ${
              escrowType === "time_locked"
                ? "border-teal bg-teal/5"
                : "border-lavender-web hover:border-teal/30"
            }`}
          >
            <h3 className="font-semibold text-gunmetal mb-1">Time-Locked</h3>
            <p className="text-xs text-gunmetal/60">With deadlines</p>
          </button>
          <button
            type="button"
            onClick={() => setEscrowType("arbitrated")}
            className={`p-4 rounded-xl border-2 transition-all ${
              escrowType === "arbitrated"
                ? "border-teal bg-teal/5"
                : "border-lavender-web hover:border-teal/30"
            }`}
          >
            <h3 className="font-semibold text-gunmetal mb-1">Arbitrated</h3>
            <p className="text-xs text-gunmetal/60">With mediator</p>
          </button>
        </div>

        <form onSubmit={handleCreateEscrow} className="space-y-6">
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

          {escrowType === "arbitrated" && (
            <div>
              <label className="block text-sm font-semibold text-gunmetal mb-2">
                Arbitrator Address *
              </label>
              <input
                type="text"
                value={arbitrator}
                onChange={(e) => setArbitrator(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none font-mono text-sm"
                required
              />
              <p className="text-xs text-gunmetal/60 mt-1">
                Third-party who can resolve disputes by releasing funds to recipient
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gunmetal mb-2">
              Amount (APT) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
              step="0.01"
              className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gunmetal mb-2">
              Memo (Optional)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Payment for services..."
              maxLength={200}
              className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
            />
          </div>

          {escrowType === "time_locked" && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gunmetal mb-2">
                  Release Time *
                </label>
                <input
                  type="datetime-local"
                  value={releaseTime}
                  onChange={(e) => setReleaseTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
                  required
                />
                <p className="text-xs text-gunmetal/60 mt-1">
                  Earliest time recipient can claim
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gunmetal mb-2">
                  Expiry Time *
                </label>
                <input
                  type="datetime-local"
                  value={expiryTime}
                  onChange={(e) => setExpiryTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
                  required
                />
                <p className="text-xs text-gunmetal/60 mt-1">
                  Auto-refund deadline
                </p>
              </div>
            </div>
          )}

          {escrowType === "arbitrated" && (
            <div>
              <label className="block text-sm font-semibold text-gunmetal mb-2">
                Expiry Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={expiryTime}
                onChange={(e) => setExpiryTime(e.target.value)}
                className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:border-teal focus:outline-none"
              />
              <p className="text-xs text-gunmetal/60 mt-1">
                Auto-refund deadline if not released
              </p>
            </div>
          )}

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
            className="w-full px-6 py-3 bg-columbia-blue text-gunmetal font-semibold rounded-xl hover:bg-columbia-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {formLoading ? "Creating Escrow..." : "Create Escrow"}
          </button>
        </form>
      </div>

      {/* Escrow List */}
      <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gunmetal mb-6">Your Escrows</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-columbia-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gunmetal/60">Loading escrows...</p>
          </div>
        ) : escrows.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gunmetal/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-gunmetal/60">No escrows yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {escrows.map((escrow) => {
              const isSender = escrow.sender.toLowerCase() === address.toLowerCase();
              const isRecipient = escrow.recipient.toLowerCase() === address.toLowerCase();
              const isArbitrator = escrow.arbitrator?.toLowerCase() === address.toLowerCase();
              const status = getEscrowStatus(escrow);
              const typeName = getEscrowTypeName(escrow.escrow_type);

              return (
                <div key={escrow.escrow_id} className="p-6 border-2 border-lavender-web rounded-xl hover:border-columbia-blue/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gunmetal">
                          {formatOctasToAPT(escrow.amount)} APT
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          status === "Active" ? "bg-green-100 text-green-700" :
                          status === "Locked" ? "bg-blue-100 text-blue-700" :
                          status === "Expired" ? "bg-orange-100 text-orange-700" :
                          status === "Released" ? "bg-teal/10 text-teal" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {status}
                        </span>
                        <span className="px-2 py-1 bg-lavender-web/30 rounded text-xs font-medium text-gunmetal">
                          {typeName}
                        </span>
                      </div>
                      <p className="text-sm text-gunmetal/60">
                        {isSender ? `To: ${escrow.recipient}` : `From: ${escrow.sender}`}
                      </p>
                    </div>
                  </div>

                  {escrow.release_time > 0 && (
                    <div className="mb-4 p-3 bg-columbia-blue/10 rounded-lg">
                      <p className="text-xs text-gunmetal/60 mb-1">Release Time</p>
                      <p className="text-sm font-semibold text-gunmetal">
                        {new Date(escrow.release_time * 1000).toLocaleString()}
                        {status === "Locked" && ` (${getTimeRemaining(escrow.release_time)})`}
                      </p>
                    </div>
                  )}

                  {/* Action Result */}
                  {actionResult && actionResult.escrowId === escrow.escrow_id && (
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
                            Escrow {actionResult.action} successfully!
                          </p>
                          <TransactionLink txHash={actionResult.txHash} network="testnet" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {(isRecipient || isArbitrator) && !escrow.released && !escrow.cancelled && (
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
        )}
      </div>
    </div>
  );
}
