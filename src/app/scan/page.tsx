"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import QRScanner from "@/components/QRScanner";
import { PaymentRequest } from "@/lib/qr";
import { formatAmount } from "@/lib/tokens";
import { transfer } from "@/lib/aptos";
import { getKeylessAccount } from "@/lib/keyless";

export default function ScanPage() {
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(true);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedAddress = sessionStorage.getItem("aptos_address");

    if (!storedAddress) {
      router.push("/");
      return;
    }

    setLoading(false);
  }, [router]);

  const handleScanSuccess = (request: PaymentRequest) => {
    setPaymentRequest(request);
    setShowScanner(false);
    setError("");
  };

  const handleScanError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const processPayment = async () => {
    if (!paymentRequest) return;

    setProcessing(true);
    setError("");

    try {
      // Get keyless account from client-side storage
      const keylessAccount = await getKeylessAccount();

      if (!keylessAccount) {
        throw new Error("Authentication expired. Please sign in again.");
      }

      // Execute transfer
      const hash = await transfer(
        keylessAccount,
        paymentRequest.recipient,
        paymentRequest.amount,
        paymentRequest.token
      );

      setTxHash(hash);
      setSuccess(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Payment failed";
      setError(errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    setShowScanner(true);
    setPaymentRequest(null);
    setError("");
    setSuccess(false);
    setTxHash("");
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
      <Header />

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gunmetal mb-3">Scan to Pay</h1>
          <p className="text-lg text-gunmetal/60">
            Scan merchant QR code to make a payment
          </p>
        </div>

        {/* QR Scanner Modal */}
        {showScanner && (
          <QRScanner
            onScanSuccess={handleScanSuccess}
            onScanError={handleScanError}
            onClose={() => router.push("/dashboard")}
          />
        )}

        {/* Payment Confirmation */}
        {paymentRequest && !success && (
          <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-columbia-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gunmetal mb-2">Confirm Payment</h2>
              <p className="text-gunmetal/60">Review payment details before proceeding</p>
            </div>

            {/* Payment Details */}
            <div className="bg-columbia-blue/10 rounded-xl p-6 mb-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-columbia-blue">
                  <span className="text-gunmetal/60">Merchant:</span>
                  <span className="font-semibold text-gunmetal text-lg">
                    {paymentRequest.merchantName || "Unknown"}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-4 border-b border-columbia-blue">
                  <span className="text-gunmetal/60">Amount:</span>
                  <span className="font-bold text-gunmetal text-2xl">
                    {formatAmount(paymentRequest.amount, paymentRequest.token)}
                  </span>
                </div>

                {paymentRequest.memo && (
                  <div className="flex justify-between items-center pb-4 border-b border-columbia-blue">
                    <span className="text-gunmetal/60">Memo:</span>
                    <span className="font-medium text-gunmetal">{paymentRequest.memo}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pb-4 border-b border-columbia-blue">
                  <span className="text-gunmetal/60">Network:</span>
                  <span className="font-medium text-gunmetal capitalize">{paymentRequest.network}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gunmetal/60">Recipient:</span>
                  <code className="font-mono text-xs text-gunmetal bg-white px-3 py-1 rounded-lg">
                    {paymentRequest.recipient.slice(0, 8)}...{paymentRequest.recipient.slice(-6)}
                  </code>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-red-900">Payment Failed</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={resetScanner}
                disabled={processing}
                className="py-3 px-6 bg-white border-2 border-lavender-web text-gunmetal rounded-xl font-semibold hover:bg-lavender-web/30 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={processPayment}
                disabled={processing}
                className="py-3 px-6 bg-gunmetal text-white rounded-xl font-semibold hover:bg-gunmetal/90 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : (
                  "Confirm Payment"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Success State */}
        {success && (
          <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gunmetal mb-2">Payment Successful!</h2>
              <p className="text-gunmetal/60">Your payment has been sent</p>
            </div>

            {/* Transaction Details */}
            <div className="bg-columbia-blue/10 rounded-xl p-6 mb-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gunmetal/60">Amount Paid:</span>
                  <span className="font-bold text-gunmetal">
                    {paymentRequest && formatAmount(paymentRequest.amount, paymentRequest.token)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gunmetal/60">Merchant:</span>
                  <span className="font-semibold text-gunmetal">
                    {paymentRequest?.merchantName || "Unknown"}
                  </span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-gunmetal/60 text-sm">Transaction Hash:</span>
                  <a
                    href={`https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-teal hover:underline break-all"
                  >
                    {txHash}
                  </a>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href="/dashboard"
                className="py-3 px-6 bg-white border-2 border-lavender-web text-gunmetal rounded-xl font-semibold hover:bg-lavender-web/30 transition-all text-center"
              >
                Go to Dashboard
              </Link>
              <button
                onClick={resetScanner}
                className="py-3 px-6 bg-gunmetal text-white rounded-xl font-semibold hover:bg-gunmetal/90 transition-all"
              >
                Scan Another Code
              </button>
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-columbia-blue/10 border border-columbia-blue rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-columbia-blue rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gunmetal mb-1">Secure</h3>
            <p className="text-sm text-gunmetal/60">Review before confirming</p>
          </div>

          <div className="bg-columbia-blue/10 border border-columbia-blue rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-columbia-blue rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gunmetal mb-1">Fast</h3>
            <p className="text-sm text-gunmetal/60">Instant confirmations</p>
          </div>

          <div className="bg-columbia-blue/10 border border-columbia-blue rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-columbia-blue rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gunmetal mb-1">Simple</h3>
            <p className="text-sm text-gunmetal/60">Just scan and pay</p>
          </div>
        </div>
      </main>
    </div>
  );
}
