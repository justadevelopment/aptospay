"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { validatePaymentAmount, sanitizeInput } from "@/lib/validation";
import { generateEphemeralKeyPair, storeEphemeralKeyPair, createGoogleAuthUrl } from "@/lib/keyless";
import { TokenSymbol, getSupportedTokens } from "@/lib/tokens";
import { getBalance } from "@/lib/aptos";

interface ReceiveProps {
  showPaymentLink?: boolean;
}

export default function Receive({ showPaymentLink = true }: ReceiveProps) {
  const [receiveAmount, setReceiveAmount] = useState("");
  const [receiveRecipient, setReceiveRecipient] = useState("");
  const [receiveToken, setReceiveToken] = useState<TokenSymbol>("APT");
  const [receiveErrors, setReceiveErrors] = useState<{ amount?: string; recipient?: string }>({});
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    const email = sessionStorage.getItem("user_email");
    const address = sessionStorage.getItem("aptos_address");

    if (email && address) {
      setUserEmail(email);
      setUserAddress(address);
      fetchBalance(address);
    }
  }, []);

  const fetchBalance = async (address: string) => {
    setLoadingBalance(true);
    try {
      const aptBalance = await getBalance(address, 'APT');
      setBalance(aptBalance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleSignIn = () => {
    const ephemeralKeyPair = generateEphemeralKeyPair();
    const nonce = storeEphemeralKeyPair(ephemeralKeyPair);
    const authUrl = createGoogleAuthUrl(nonce);
    window.location.href = authUrl;
  };

  const generatePaymentLink = async () => {
    if (!userEmail || !userAddress) {
      setReceiveErrors({ amount: "Please sign in to create payment links" });
      return;
    }

    setReceiveErrors({});
    setReceiveLoading(true);

    try {
      const amountValidation = validatePaymentAmount(receiveAmount, receiveToken);
      const newErrors: { amount?: string; recipient?: string } = {};

      if (!amountValidation.isValid) {
        newErrors.amount = amountValidation.error;
      }

      const aptosAddressRegex = /^0x[a-fA-F0-9]{64}$/;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const isAddress = aptosAddressRegex.test(receiveRecipient.trim());
      const isEmail = emailRegex.test(receiveRecipient.trim());

      if (!isAddress && !isEmail) {
        newErrors.recipient = "Enter a valid email or Aptos address (0x...)";
      }

      if (Object.keys(newErrors).length > 0) {
        setReceiveErrors(newErrors);
        setReceiveLoading(false);
        return;
      }

      const sanitizedAmount = sanitizeInput(receiveAmount);
      const sanitizedRecipient = sanitizeInput(receiveRecipient).toLowerCase();
      const senderAddress = sessionStorage.getItem("aptos_address") || undefined;

      if (isAddress) {
        setReceiveErrors({ recipient: "Direct address transfers coming soon. Use email for now." });
        setReceiveLoading(false);
        return;
      }

      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: sanitizedAmount,
          recipientEmail: sanitizedRecipient,
          senderAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setReceiveErrors({ amount: data.error || "Failed to create payment" });
        setReceiveLoading(false);
        return;
      }

      setPaymentLink(data.paymentUrl);
    } catch (error) {
      console.error("Error creating payment:", error);
      setReceiveErrors({ amount: "Failed to create payment link. Please try again." });
    } finally {
      setReceiveLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!paymentLink) return;
    await navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="perspective-1000">
      <div className="bg-white border border-lavender-web/30 rounded-2xl p-5 h-full flex flex-col relative overflow-hidden transform-style-3d transition-all duration-500 hover:shadow-[0_20px_60px_0_rgba(16,39,112,0.15)] shadow-[0_12px_35px_0_rgba(16,39,112,0.07)]">
        <div className="absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-lavender-web/10 opacity-60"></div>
        <div className="relative z-10">
          <h3 className="text-xs font-semibold text-gunmetal mb-4 uppercase tracking-wide">Receive</h3>

          {userEmail && userAddress ? (
            <div className="space-y-3 flex-1 flex flex-col">
              {/* Balance Display */}
              <div className="p-2 bg-gradient-to-br from-teal/10 to-teal/5 rounded-lg border border-teal/30 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[9px] text-gunmetal/60 uppercase tracking-wide">Balance</p>
                    <Image
                      src="/aptos-apt-logo.svg"
                      alt="APT"
                      width={16}
                      height={16}
                      className="w-4 h-4 opacity-50"
                    />
                  </div>
                  {loadingBalance ? (
                    <div className="w-20 h-5 bg-lavender-web animate-pulse rounded"></div>
                  ) : (
                    <p className="text-xl font-bold text-teal">
                      {balance !== null ? `${balance.toFixed(4)} APT` : "-.-- APT"}
                    </p>
                  )}
                </div>
              </div>

              {/* Wallet Address */}
              <div className="p-2 bg-gradient-to-br from-gunmetal/10 to-gunmetal/5 rounded-lg border border-gunmetal/20 relative overflow-hidden group">
                <p className="text-[9px] text-gunmetal/60 mb-1 uppercase tracking-wide">Your Address</p>
                <div className="group relative">
                  <code className="block px-2 py-1.5 bg-white rounded text-[10px] font-mono text-gunmetal break-all">
                    {userAddress.slice(0, 18)}...{userAddress.slice(-10)}
                  </code>
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(userAddress);
                        setCopiedAddress(true);
                        setTimeout(() => setCopiedAddress(false), 2000);
                      }}
                      className="p-1.5 bg-gunmetal text-white rounded hover:bg-gunmetal/90 transition-all"
                      title="Copy address"
                    >
                      {copiedAddress ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    <a
                      href={`https://explorer.aptoslabs.com/account/${userAddress}?network=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-teal text-white rounded hover:bg-teal/90 transition-all"
                      title="View on Explorer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Request Payment Form */}
              <div className="pt-2 border-t border-lavender-web flex-1 flex flex-col">
                <p className="text-[10px] font-semibold text-gunmetal/60 mb-2 uppercase tracking-wide">Request Payment</p>

                {/* Token Selector */}
                <div className="mb-2">
                  <label className="block text-[9px] font-semibold text-gunmetal mb-1 uppercase tracking-wide">
                    Token
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {getSupportedTokens().map((tokenSymbol) => (
                      <button
                        key={tokenSymbol}
                        type="button"
                        onClick={() => setReceiveToken(tokenSymbol)}
                        className={`py-1.5 px-3 rounded-lg font-semibold text-xs transition-all ${
                          receiveToken === tokenSymbol
                            ? "bg-teal text-white"
                            : "bg-white border-2 border-lavender-web text-gunmetal hover:bg-lavender-web/30"
                        }`}
                      >
                        {tokenSymbol}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Input */}
                <div className="mb-2">
                  <label className="block text-[9px] font-semibold text-gunmetal mb-1 uppercase tracking-wide">
                    Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={receiveAmount}
                      onChange={(e) => {
                        setReceiveAmount(e.target.value);
                        if (receiveErrors.amount) setReceiveErrors({ ...receiveErrors, amount: undefined });
                      }}
                      placeholder="0.00"
                      step={receiveToken === 'USDC' ? "0.000001" : "0.00000001"}
                      min="0.000001"
                      max="1000000"
                      className={`w-full pl-3 pr-12 py-2 text-sm border-2 rounded-lg focus:outline-none transition-colors ${
                        receiveErrors.amount
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-lavender-web focus:border-teal'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gunmetal/50 font-medium text-xs">
                      {receiveToken}
                    </span>
                  </div>
                  {receiveErrors.amount && (
                    <p className="text-red-500 text-[9px] mt-0.5">{receiveErrors.amount}</p>
                  )}
                </div>

                {/* From Email Input */}
                <div className="mb-2">
                  <label className="block text-[9px] font-semibold text-gunmetal mb-1 uppercase tracking-wide">
                    From (Email)
                  </label>
                  <input
                    type="email"
                    value={receiveRecipient}
                    onChange={(e) => {
                      setReceiveRecipient(e.target.value);
                      if (receiveErrors.recipient) setReceiveErrors({ ...receiveErrors, recipient: undefined });
                    }}
                    placeholder="alice@example.com"
                    className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none transition-colors ${
                      receiveErrors.recipient
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-lavender-web focus:border-teal'
                    }`}
                  />
                  {receiveErrors.recipient && (
                    <p className="text-red-500 text-[9px] mt-0.5">{receiveErrors.recipient}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button
                    onClick={generatePaymentLink}
                    disabled={!receiveAmount || !receiveRecipient || receiveLoading}
                    className="py-2.5 bg-gunmetal text-white rounded-lg font-semibold text-xs hover:bg-gunmetal/90 disabled:bg-lavender-web disabled:text-gunmetal/30 transition-all flex items-center justify-center space-x-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>{receiveLoading ? "Creating..." : "Generate Link"}</span>
                  </button>
                  <button
                    onClick={async () => {
                      alert("QR code generation coming soon!");
                    }}
                    disabled={!receiveAmount || !receiveRecipient || receiveLoading}
                    className="py-2.5 bg-teal text-white rounded-lg font-semibold text-xs hover:bg-teal/90 disabled:bg-lavender-web disabled:text-gunmetal/30 transition-all flex items-center justify-center space-x-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span>Generate QR</span>
                  </button>
                </div>
              </div>

              {/* Payment Link Display */}
              {showPaymentLink && paymentLink && (
                <div className="mt-3 p-3 bg-columbia-blue/30 border-2 border-columbia-blue rounded-xl animate-fadeIn">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gunmetal">Payment link ready</span>
                    <span className="text-[10px] bg-teal text-white px-2 py-0.5 rounded-full">Active</span>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={paymentLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border-2 border-columbia-blue rounded-lg text-xs font-mono text-gunmetal"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-4 py-2 bg-gunmetal text-white rounded-lg hover:bg-gunmetal/90 transition-all text-xs"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-[10px] text-gunmetal/60">
                    Send to <span className="font-medium">{receiveRecipient}</span> for <span className="font-medium">${receiveAmount}</span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gunmetal/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="text-xs text-gunmetal/60 mb-3">Sign in to receive payments</p>
              <button
                onClick={handleSignIn}
                className="px-4 py-2 bg-gunmetal text-white rounded-lg hover:bg-gunmetal/90 transition-all text-xs font-semibold inline-flex items-center space-x-1.5"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign in</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
