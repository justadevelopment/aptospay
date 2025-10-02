"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatAmount } from "@/lib/tokens";
import { EscrowDetails } from "@/lib/aptos";

export default function EscrowPage() {
  const [address, setAddress] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Create Escrow Form State
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // View Escrow State
  const [escrowId, setEscrowId] = useState("");
  const [escrowDetails, setEscrowDetails] = useState<EscrowDetails | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const storedAddress = sessionStorage.getItem("aptos_address");
    const storedEmail = sessionStorage.getItem("user_email");

    if (!storedAddress) {
      router.push("/");
      return;
    }

    setAddress(storedAddress);
    setEmail(storedEmail || "");
    setLoading(false);
  }, [router]);

  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");

    try {
      const jwt = sessionStorage.getItem("google_jwt");
      const ephemeralKeyPairStr = sessionStorage.getItem("ephemeral_keypair");

      if (!jwt || !ephemeralKeyPairStr) {
        throw new Error("Please sign in again");
      }

      const response = await fetch("/api/escrow/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          amount: parseFloat(amount),
          memo,
          jwt,
          ephemeralKeyPairStr,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create escrow");
      }

      alert(`✅ Escrow created successfully!\nTransaction: ${data.transactionHash}`);
      setRecipient("");
      setAmount("");
      setMemo("");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create escrow");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleFetchEscrow = async () => {
    if (!escrowId) return;

    setFetchLoading(true);
    setEscrowDetails(null);

    try {
      const response = await fetch(`/api/escrow/${escrowId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch escrow");
      }

      setEscrowDetails(data.escrow);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to fetch escrow");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleReleaseEscrow = async () => {
    if (!escrowDetails) return;

    setActionLoading(true);
    setActionError("");

    try {
      const jwt = sessionStorage.getItem("google_jwt");
      const ephemeralKeyPairStr = sessionStorage.getItem("ephemeral_keypair");

      if (!jwt || !ephemeralKeyPairStr) {
        throw new Error("Please sign in again");
      }

      const response = await fetch("/api/escrow/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escrowId: escrowDetails.escrowId,
          jwt,
          ephemeralKeyPairStr,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to release escrow");
      }

      alert(`✅ Escrow released successfully!\nTransaction: ${data.transactionHash}`);
      setEscrowDetails(null);
      setEscrowId("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to release escrow");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEscrow = async () => {
    if (!escrowDetails) return;

    setActionLoading(true);
    setActionError("");

    try {
      const jwt = sessionStorage.getItem("google_jwt");
      const ephemeralKeyPairStr = sessionStorage.getItem("ephemeral_keypair");

      if (!jwt || !ephemeralKeyPairStr) {
        throw new Error("Please sign in again");
      }

      const response = await fetch("/api/escrow/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escrowId: escrowDetails.escrowId,
          jwt,
          ephemeralKeyPairStr,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel escrow");
      }

      alert(`✅ Escrow cancelled successfully!\nTransaction: ${data.transactionHash}`);
      setEscrowDetails(null);
      setEscrowId("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to cancel escrow");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gunmetal/60">Loading...</p>
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
              <span className="text-xl font-semibold text-gunmetal" style={{ fontFamily: "'Outfit', sans-serif" }}>
                aptospay
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm font-medium text-gunmetal/60 hover:text-gunmetal transition-colors">
                Dashboard
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
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gunmetal mb-3">Escrow Payments</h1>
          <p className="text-lg text-gunmetal/60">
            Secure trustless payments with on-chain escrow
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Create Escrow */}
          <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-gunmetal mb-6">Create Escrow</h2>

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
                  className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:outline-none focus:border-teal transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gunmetal mb-2">
                  Amount (APT) *
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  step="0.00000001"
                  min="0.00000001"
                  className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:outline-none focus:border-teal transition-colors"
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
                  placeholder="Payment description..."
                  maxLength={100}
                  className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:outline-none focus:border-teal transition-colors"
                />
                <p className="text-xs text-gunmetal/40 mt-1">{memo.length}/100 characters</p>
              </div>

              {createError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-900">{createError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={createLoading}
                className="w-full py-4 px-6 bg-gunmetal text-white rounded-xl font-bold text-lg hover:bg-gunmetal/90 disabled:opacity-50 transition-all"
              >
                {createLoading ? "Creating..." : "Create Escrow"}
              </button>
            </form>

            <div className="mt-6 p-4 bg-columbia-blue/10 rounded-xl">
              <h3 className="text-sm font-semibold text-gunmetal mb-2">How it works:</h3>
              <ul className="text-sm text-gunmetal/60 space-y-1">
                <li>• Funds are locked in a smart contract</li>
                <li>• Recipient can claim funds</li>
                <li>• You can cancel if not claimed</li>
              </ul>
            </div>
          </div>

          {/* View/Manage Escrow */}
          <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-gunmetal mb-6">Manage Escrow</h2>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gunmetal mb-2">
                Escrow ID
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={escrowId}
                  onChange={(e) => setEscrowId(e.target.value)}
                  placeholder="Enter escrow ID..."
                  className="flex-1 px-4 py-3 border-2 border-lavender-web rounded-xl focus:outline-none focus:border-teal transition-colors"
                />
                <button
                  onClick={handleFetchEscrow}
                  disabled={!escrowId || fetchLoading}
                  className="px-6 py-3 bg-columbia-blue text-gunmetal rounded-xl font-semibold hover:bg-columbia-blue/80 disabled:opacity-50 transition-all"
                >
                  {fetchLoading ? "Loading..." : "Load"}
                </button>
              </div>
            </div>

            {escrowDetails && (
              <div className="space-y-6">
                <div className="bg-columbia-blue/10 rounded-xl p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gunmetal/60">Escrow ID:</span>
                      <span className="font-semibold text-gunmetal">#{escrowDetails.escrowId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gunmetal/60">Amount:</span>
                      <span className="font-bold text-gunmetal text-xl">
                        {formatAmount(escrowDetails.amount, 'APT')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gunmetal/60">Sender:</span>
                      <code className="font-mono text-xs text-gunmetal">
                        {escrowDetails.sender.slice(0, 6)}...{escrowDetails.sender.slice(-4)}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gunmetal/60">Recipient:</span>
                      <code className="font-mono text-xs text-gunmetal">
                        {escrowDetails.recipient.slice(0, 6)}...{escrowDetails.recipient.slice(-4)}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gunmetal/60">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        escrowDetails.released
                          ? "bg-green-100 text-green-700"
                          : escrowDetails.cancelled
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {escrowDetails.released ? "Released" : escrowDetails.cancelled ? "Cancelled" : "Active"}
                      </span>
                    </div>
                  </div>
                </div>

                {actionError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-900">{actionError}</p>
                  </div>
                )}

                {!escrowDetails.released && !escrowDetails.cancelled && (
                  <div className="grid grid-cols-2 gap-4">
                    {escrowDetails.recipient.toLowerCase() === address.toLowerCase() && (
                      <button
                        onClick={handleReleaseEscrow}
                        disabled={actionLoading}
                        className="py-3 px-6 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-all"
                      >
                        {actionLoading ? "Processing..." : "Release"}
                      </button>
                    )}
                    {escrowDetails.sender.toLowerCase() === address.toLowerCase() && (
                      <button
                        onClick={handleCancelEscrow}
                        disabled={actionLoading}
                        className="py-3 px-6 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-all"
                      >
                        {actionLoading ? "Processing..." : "Cancel"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
