"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { QRCodeSVG } from "qrcode.react";
import { generatePaymentRequest } from "@/lib/qr";
import { TokenSymbol, getSupportedTokens, formatAmount } from "@/lib/tokens";

export default function MerchantPage() {
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [merchantName, setMerchantName] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<TokenSymbol>("APT");
  const [memo, setMemo] = useState("");
  const [qrData, setQrData] = useState<string>("");
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedAddress = sessionStorage.getItem("aptos_address");

    if (!storedAddress) {
      router.push("/");
      return;
    }

    setAddress(storedAddress);
    setLoading(false);
  }, [router]);

  const generateQR = () => {
    setError("");

    // Validate inputs
    if (!merchantName.trim()) {
      setError("Please enter your business name");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      // Generate payment request
      const paymentRequestData = generatePaymentRequest({
        token,
        amount: amountNum,
        recipient: address,
        memo: memo.trim() || undefined,
        merchantName: merchantName.trim(),
        network: "testnet",
      });

      setQrData(paymentRequestData);
      setShowQR(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate QR code");
    }
  };

  const resetForm = () => {
    setShowQR(false);
    setQrData("");
    setAmount("");
    setMemo("");
    setError("");
  };

  const downloadQR = () => {
    const svg = document.getElementById("payment-qr-code");
    if (!svg) return;

    // Convert SVG to PNG and download
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = document.createElement("img");

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `aptfy-${merchantName.replace(/\s+/g, "-")}-${amount}-${token}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
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
          <h1 className="text-4xl font-bold text-gunmetal mb-3">Merchant Payment Request</h1>
          <p className="text-lg text-gunmetal/60">
            Generate a QR code for customers to scan and pay
          </p>
        </div>

        {showQR ? (
          // QR Code Display
          <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gunmetal mb-2">Payment QR Code</h2>
              <p className="text-gunmetal/60">Customer can scan this code to pay</p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center mb-6">
              <div className="bg-white p-6 rounded-2xl border-2 border-gunmetal mb-4">
                <QRCodeSVG
                  id="payment-qr-code"
                  value={qrData}
                  size={300}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Payment Details */}
              <div className="bg-columbia-blue/10 rounded-xl p-6 w-full max-w-md">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gunmetal/60">Merchant:</span>
                    <span className="font-semibold text-gunmetal">{merchantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gunmetal/60">Amount:</span>
                    <span className="font-bold text-gunmetal text-xl">
                      {formatAmount(parseFloat(amount), token)}
                    </span>
                  </div>
                  {memo && (
                    <div className="flex justify-between">
                      <span className="text-gunmetal/60">Memo:</span>
                      <span className="font-medium text-gunmetal">{memo}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gunmetal/60">Network:</span>
                    <span className="font-medium text-gunmetal">Testnet</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={downloadQR}
                className="py-3 px-6 bg-gunmetal text-white rounded-xl font-semibold hover:bg-gunmetal/90 transition-all"
              >
                Download QR Code
              </button>
              <button
                onClick={resetForm}
                className="py-3 px-6 bg-white border-2 border-lavender-web text-gunmetal rounded-xl font-semibold hover:bg-lavender-web/30 transition-all"
              >
                Create New Request
              </button>
            </div>
          </div>
        ) : (
          // Payment Request Form
          <div className="bg-white border-2 border-lavender-web rounded-2xl p-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                generateQR();
              }}
              className="space-y-6"
            >
              {/* Merchant Name */}
              <div>
                <label className="block text-sm font-semibold text-gunmetal mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="e.g., Joe's Coffee Shop"
                  className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:outline-none focus:border-teal transition-colors"
                  required
                />
              </div>

              {/* Token Selection */}
              <div>
                <label className="block text-sm font-semibold text-gunmetal mb-2">
                  Token *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {getSupportedTokens().map((tokenSymbol) => (
                    <button
                      key={tokenSymbol}
                      type="button"
                      onClick={() => setToken(tokenSymbol)}
                      className={`py-3 px-6 rounded-xl font-semibold transition-all ${
                        token === tokenSymbol
                          ? "bg-gunmetal text-white"
                          : "bg-white border-2 border-lavender-web text-gunmetal hover:bg-lavender-web/30"
                      }`}
                    >
                      {tokenSymbol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gunmetal mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:outline-none focus:border-teal transition-colors"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gunmetal/60 font-medium">
                    {token}
                  </span>
                </div>
              </div>

              {/* Memo */}
              <div>
                <label className="block text-sm font-semibold text-gunmetal mb-2">
                  Memo (Optional)
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="e.g., Order #1234, Table 5"
                  maxLength={100}
                  className="w-full px-4 py-3 border-2 border-lavender-web rounded-xl focus:outline-none focus:border-teal transition-colors"
                />
                <p className="text-xs text-gunmetal/40 mt-1">{memo.length}/100 characters</p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-900">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 px-6 bg-gunmetal text-white rounded-xl font-bold text-lg hover:bg-gunmetal/90 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
              >
                Generate QR Code
              </button>
            </form>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-columbia-blue/10 border border-columbia-blue rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-columbia-blue rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gunmetal mb-1">Easy Setup</h3>
            <p className="text-sm text-gunmetal/60">Generate QR codes in seconds</p>
          </div>

          <div className="bg-columbia-blue/10 border border-columbia-blue rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-columbia-blue rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gunmetal mb-1">Secure</h3>
            <p className="text-sm text-gunmetal/60">Non-custodial payments</p>
          </div>

          <div className="bg-columbia-blue/10 border border-columbia-blue rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-columbia-blue rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gunmetal mb-1">Instant</h3>
            <p className="text-sm text-gunmetal/60">Real-time confirmations</p>
          </div>
        </div>
      </main>
    </div>
  );
}
