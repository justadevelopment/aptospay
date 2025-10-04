"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { validatePaymentAmount, sanitizeInput } from "@/lib/validation";
import { generateEphemeralKeyPair, storeEphemeralKeyPair, createGoogleAuthUrl } from "@/lib/keyless";
import { TokenSymbol, getSupportedTokens } from "@/lib/tokens";
import { getBalance } from "@/lib/aptos";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";

export default function Home() {
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [receiveToken, setReceiveToken] = useState<TokenSymbol>("APT"); // For Receive section
  const [sendToken, setSendToken] = useState<TokenSymbol>("APT"); // For Send section
  const [paymentLink, setPaymentLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; recipient?: string }>({});
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const router = useRouter();

  // Check if user is logged in and fetch balance
  useEffect(() => {
    const email = sessionStorage.getItem("user_email");
    const address = sessionStorage.getItem("aptos_address");

    if (email && address) {
      setUserEmail(email);
      setUserAddress(address);
      fetchBalance(address);

      // Auto-refresh balance every 10 seconds
      const intervalId = setInterval(() => {
        fetchBalance(address);
      }, 10000);

      return () => clearInterval(intervalId);
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

  const handleSignOut = () => {
    sessionStorage.clear();
    setUserEmail(null);
    setUserAddress(null);
    setBalance(null);
    router.refresh();
  };


  const generatePaymentLink = async () => {
    // Check if user is signed in
    if (!userEmail || !userAddress) {
      setErrors({ amount: "Please sign in to create payment links" });
      return;
    }

    // Reset errors
    setErrors({});
    setLoading(true);

    try {
      // Validate amount
      const amountValidation = validatePaymentAmount(amount);
      const newErrors: { amount?: string; recipient?: string } = {};

      if (!amountValidation.isValid) {
        newErrors.amount = amountValidation.error;
      }

      // Detect if recipient is email or address using regex
      const aptosAddressRegex = /^0x[a-fA-F0-9]{64}$/;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const isAddress = aptosAddressRegex.test(recipient.trim());
      const isEmail = emailRegex.test(recipient.trim());

      if (!isAddress && !isEmail) {
        newErrors.recipient = "Enter a valid email or Aptos address (0x...)";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setLoading(false);
        return;
      }

      // Sanitize inputs
      const sanitizedAmount = sanitizeInput(amount);
      const sanitizedRecipient = sanitizeInput(recipient).toLowerCase();

      // Get sender address if logged in
      const senderAddress = sessionStorage.getItem("aptos_address") || undefined;

      // If address is provided, send directly (TODO: implement direct transfer)
      if (isAddress) {
        setErrors({ recipient: "Direct address transfers coming soon. Use email for now." });
        setLoading(false);
        return;
      }

      // Create payment in database via API (email flow)
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
        setErrors({ amount: data.error || "Failed to create payment" });
        setLoading(false);
        return;
      }

      setPaymentLink(data.paymentUrl);
    } catch (error) {
      console.error("Error creating payment:", error);
      setErrors({ amount: "Failed to create payment link. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!paymentLink) return;

    await navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Navigation */}
      <nav className="border-b border-lavender-web">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
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

          <div className="flex items-center space-x-4">
            {userEmail ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gunmetal hover:text-teal transition-colors font-medium"
                >
                  Dashboard
                </Link>

                <Link
                  href="/transactions"
                  className="text-gunmetal hover:text-teal transition-colors font-medium"
                >
                  Transactions
                </Link>

                {/* Balance Display */}
                <div className="px-4 py-2 bg-teal/10 border-2 border-teal/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Image
                      src="/aptos-apt-logo.svg"
                      alt="APT"
                      width={20}
                      height={20}
                      className="w-5 h-5"
                    />
                    {loadingBalance ? (
                      <div className="w-12 h-4 bg-teal/20 animate-pulse rounded"></div>
                    ) : (
                      <span className="text-sm font-bold text-teal">
                        {balance !== null ? `${balance.toFixed(4)} APT` : "-.-- APT"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-xs text-gunmetal/60">Signed in as</p>
                    <p className="text-sm font-medium text-gunmetal truncate max-w-[150px]">{userEmail}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 text-sm border-2 border-lavender-web text-gunmetal rounded-lg hover:bg-lavender-web/30 transition-colors font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/docs"
                  className="text-gunmetal hover:text-teal transition-colors font-medium"
                >
                  Docs
                </Link>
                <button
                  onClick={handleSignIn}
                  className="px-6 py-2 bg-gunmetal text-white rounded-lg hover:bg-gunmetal/90 transition-all transform hover:scale-105 active:scale-95 font-semibold flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6">
        {/* Forms Section */}
        <section className="py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
            {/* Left - Receive Component */}
            <div id="receive" className="perspective-1000">
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
                            value={amount}
                            onChange={(e) => {
                              setAmount(e.target.value);
                              if (errors.amount) setErrors({ ...errors, amount: undefined });
                            }}
                            placeholder="0.00"
                            step={receiveToken === 'USDC' ? "0.000001" : "0.00000001"}
                            min="0.000001"
                            max="1000000"
                            className={`w-full pl-3 pr-12 py-2 text-sm border-2 rounded-lg focus:outline-none transition-colors ${
                              errors.amount
                                ? 'border-red-400 focus:border-red-500'
                                : 'border-lavender-web focus:border-teal'
                            }`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gunmetal/50 font-medium text-xs">
                            {receiveToken}
                          </span>
                        </div>
                        {errors.amount && (
                          <p className="text-red-500 text-[9px] mt-0.5">{errors.amount}</p>
                        )}
                      </div>

                      {/* From Email Input */}
                      <div className="mb-2">
                        <label className="block text-[9px] font-semibold text-gunmetal mb-1 uppercase tracking-wide">
                          From (Email)
                        </label>
                        <input
                          type="email"
                          value={recipient}
                          onChange={(e) => {
                            setRecipient(e.target.value);
                            if (errors.recipient) setErrors({ ...errors, recipient: undefined });
                          }}
                          placeholder="alice@example.com"
                          className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none transition-colors ${
                            errors.recipient
                              ? 'border-red-400 focus:border-red-500'
                              : 'border-lavender-web focus:border-teal'
                          }`}
                        />
                        {errors.recipient && (
                          <p className="text-red-500 text-[9px] mt-0.5">{errors.recipient}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button
                          onClick={generatePaymentLink}
                          disabled={!amount || !recipient || loading}
                          className="py-2.5 bg-gunmetal text-white rounded-lg font-semibold text-xs hover:bg-gunmetal/90 disabled:bg-lavender-web disabled:text-gunmetal/30 transition-all flex items-center justify-center space-x-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span>{loading ? "Creating..." : "Generate Link"}</span>
                        </button>
                        <button
                          onClick={async () => {
                            // TODO: Implement QR code generation
                            alert("QR code generation coming soon!");
                          }}
                          disabled={!amount || !recipient || loading}
                          className="py-2.5 bg-teal text-white rounded-lg font-semibold text-xs hover:bg-teal/90 disabled:bg-lavender-web disabled:text-gunmetal/30 transition-all flex items-center justify-center space-x-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          <span>Generate QR</span>
                        </button>
                      </div>
                    </div>
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

            {/* Right - Send Component */}
            <div id="send" className="perspective-1000">
          <div className="bg-white border border-lavender-web/30 rounded-2xl p-5 h-full flex flex-col relative overflow-hidden transform-style-3d transition-all duration-500 hover:shadow-[0_20px_60px_0_rgba(16,39,112,0.15)] shadow-[0_12px_35px_0_rgba(16,39,112,0.07)]">
            <div className="absolute inset-0 bg-gradient-to-br from-columbia-blue/5 via-transparent to-teal/10 opacity-60"></div>
            <div className="relative z-10">
            <h3 className="text-xs font-semibold text-gunmetal mb-4 uppercase tracking-wide">Send</h3>
            <div className="space-y-3 flex-1 flex flex-col">
              {/* Token Selector */}
              <div>
                <label className="block text-[9px] font-semibold text-gunmetal mb-1 uppercase tracking-wide">
                  Token
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {getSupportedTokens().map((tokenSymbol) => (
                    <button
                      key={tokenSymbol}
                      type="button"
                      onClick={() => setSendToken(tokenSymbol)}
                      className={`py-1.5 px-3 rounded-lg font-semibold text-xs transition-all ${
                        sendToken === tokenSymbol
                          ? "bg-gunmetal text-white"
                          : "bg-white border-2 border-lavender-web text-gunmetal hover:bg-lavender-web/30"
                      }`}
                    >
                      {tokenSymbol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-[9px] font-semibold text-gunmetal mb-1 uppercase tracking-wide">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (errors.amount) setErrors({ ...errors, amount: undefined });
                    }}
                    placeholder="0.00"
                    step={sendToken === 'USDC' ? "0.000001" : "0.00000001"}
                    min="0.000001"
                    max="1000000"
                    className={`w-full pl-3 pr-12 py-2 text-sm border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.amount
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-lavender-web focus:border-teal'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gunmetal/50 font-medium text-xs">
                    {sendToken}
                  </span>
                </div>
                {errors.amount && (
                  <p className="text-red-500 text-[9px] mt-0.5">{errors.amount}</p>
                )}
              </div>

              {/* Recipient Input - Email or Address */}
              <div>
                <label className="block text-[9px] font-semibold text-gunmetal mb-1 uppercase tracking-wide">
                  Recipient (Email or Address)
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    if (errors.recipient) setErrors({ ...errors, recipient: undefined });
                  }}
                  placeholder="alice@example.com or 0x..."
                  className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.recipient
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-lavender-web focus:border-teal'
                  }`}
                />
                {errors.recipient && (
                  <p className="text-red-500 text-[9px] mt-0.5">{errors.recipient}</p>
                )}
              </div>

              {/* Send Button - Direct Transfer */}
              <button
                onClick={async () => {
                  // Check if signed in
                  if (!userEmail || !userAddress) {
                    setErrors({ amount: "Please sign in to send payments" });
                    return;
                  }

                  // Validate
                  const amountValidation = validatePaymentAmount(amount);
                  if (!amountValidation.isValid) {
                    setErrors({ amount: amountValidation.error });
                    return;
                  }

                  // Detect email vs address
                  const aptosAddressRegex = /^0x[a-fA-F0-9]{64}$/;
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  const isAddress = aptosAddressRegex.test(recipient.trim());
                  const isEmail = emailRegex.test(recipient.trim());

                  if (!isAddress && !isEmail) {
                    setErrors({ recipient: "Enter a valid email or Aptos address" });
                    return;
                  }

                  setLoading(true);
                  setErrors({});

                  try {
                    // Get sender credentials
                    const jwt = sessionStorage.getItem("jwt_token");
                    const ephemeralKeyPairStr = sessionStorage.getItem("ephemeral_keypair");

                    if (!jwt || !ephemeralKeyPairStr) {
                      setErrors({ amount: "Please sign in again to send payments" });
                      setLoading(false);
                      return;
                    }

                    let recipientAddr = recipient.trim();

                    // If email, resolve to address
                    if (isEmail) {
                      const resolveResponse = await fetch("/api/resolve-email", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: recipient.trim() }),
                      });

                      const resolveData = await resolveResponse.json();

                      if (!resolveResponse.ok) {
                        setErrors({ recipient: resolveData.error });
                        setLoading(false);
                        return;
                      }

                      recipientAddr = resolveData.aptosAddress;
                    }

                    // Direct transfer to address
                    const response = await fetch("/api/payments/send-direct", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        amount: parseFloat(amount),
                        recipientAddress: recipientAddr,
                        token: sendToken,
                        jwt,
                        ephemeralKeyPairStr,
                      }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(data.error || "Transfer failed");
                    }

                    alert(`✅ Sent ${amount} ${sendToken} to ${isEmail ? recipient.trim() : 'address'}! Transaction: ${data.transactionHash}`);
                    setAmount("");
                    setRecipient("");
                  } catch (error) {
                    console.error("Send error:", error);
                    setErrors({ amount: error instanceof Error ? error.message : "Failed to send" });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={!amount || !recipient || loading}
                className="w-full py-2.5 bg-gunmetal text-white rounded-lg font-semibold text-xs hover:bg-gunmetal/90 disabled:bg-lavender-web disabled:text-gunmetal/30 transition-all"
              >
                {loading ? "Sending..." : "Send"}
              </button>

              {/* Hero Text in Send Card */}
              <div className="flex-1 flex items-center justify-center text-center pt-4 border-t border-lavender-web/50 mt-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-teal/5 to-transparent rounded-b-2xl"></div>

                {/* Animated Waves */}
                <div className="absolute bottom-0 left-0 w-full">
                  <svg className="waves" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
                    <defs>
                      <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
                    </defs>
                    <g className="parallax">
                      <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(31,122,140,0.1)" />
                      <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(31,122,140,0.15)" />
                      <use xlinkHref="#gentle-wave" x="48" y="5" fill="rgba(31,122,140,0.2)" />
                      <use xlinkHref="#gentle-wave" x="48" y="7" fill="rgba(31,122,140,0.25)" />
                    </g>
                  </svg>
                </div>

                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-gunmetal mb-2 leading-tight animate-fadeIn">
                    Send money to anyone,<br />
                    <span className="text-teal">by email</span>
                  </h2>
                  <p className="text-xs text-gunmetal/70 leading-relaxed">
                    Direct transfers to addresses or payment links via email
                  </p>
                </div>
              </div>
            </div>
            </div>

            {/* Generated Link */}
            {paymentLink && (
              <div className="mt-6 p-4 bg-columbia-blue/30 border-2 border-columbia-blue rounded-xl animate-fadeIn">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gunmetal">Payment link ready</span>
                  <span className="text-xs bg-teal text-white px-3 py-1 rounded-full">
                    Active
                  </span>
                </div>

                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="text"
                    value={paymentLink}
                    readOnly
                    className="flex-1 px-4 py-3 bg-white border-2 border-columbia-blue rounded-lg text-sm font-mono text-gunmetal"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-6 py-3 bg-gunmetal text-white rounded-lg hover:bg-gunmetal/90 transition-all transform hover:scale-105 active:scale-95"
                  >
                    {copied ? (
                      <span className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </span>
                    ) : (
                      "Copy"
                    )}
                  </button>
                </div>

                <p className="text-sm text-gunmetal/60 mb-4">
                  Send this link to <span className="font-medium text-gunmetal">{recipient}</span> to receive <span className="font-medium text-gunmetal">${amount}</span>
                </p>

                {/* Share Buttons */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gunmetal/60">Share via:</span>
                  <a
                    href={`mailto:${recipient}?subject=You've got money!&body=Hey! I'm sending you $${amount} via Aptfy. Click here to claim: ${paymentLink}`}
                    className="px-3 py-2 bg-white border-2 border-columbia-blue text-gunmetal rounded-lg hover:bg-columbia-blue/20 transition-all text-xs font-medium inline-flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Email</span>
                  </a>
                  <a
                    href={`https://wa.me/?text=Hey! I'm sending you $${amount} via Aptfy. Click here to claim: ${encodeURIComponent(paymentLink)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-white border-2 border-columbia-blue text-gunmetal rounded-lg hover:bg-columbia-blue/20 transition-all text-xs font-medium inline-flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=I'm sending you $${amount} via Aptfy! Claim it here: ${encodeURIComponent(paymentLink)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-white border-2 border-columbia-blue text-gunmetal rounded-lg hover:bg-columbia-blue/20 transition-all text-xs font-medium inline-flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>X</span>
                  </a>
                </div>
              </div>
            )}
          </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 border-t border-lavender-web">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gunmetal mb-4">How it works</h2>
            <p className="text-lg text-gunmetal/70">Simple, fast, and secure payments on Aptos</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center group">
              <div className="w-16 h-16 bg-columbia-blue rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-teal transition-colors">
                <svg className="w-8 h-8 text-gunmetal group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal mb-2">Create link</h3>
              <p className="text-gunmetal/60 leading-relaxed">
                Enter amount and recipient email to generate a secure payment link
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-columbia-blue rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-teal transition-colors">
                <svg className="w-8 h-8 text-gunmetal group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal mb-2">Share link</h3>
              <p className="text-gunmetal/60 leading-relaxed">
                Send the link via email, message, or any communication channel
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-columbia-blue rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-teal transition-colors">
                <svg className="w-8 h-8 text-gunmetal group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal mb-2">Instant claim</h3>
              <p className="text-gunmetal/60 leading-relaxed">
                Recipient signs in with Google and receives funds immediately
              </p>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-20">
          <div className="bg-lavender-web rounded-3xl p-12 text-center">
            <h3 className="text-2xl font-bold text-gunmetal mb-4">
              powered by aptos keyless accounts
            </h3>
            <p className="text-lg text-gunmetal/70 max-w-2xl mx-auto mb-8">
              No seed phrases. No browser extensions. Just sign in with Google and start transacting on the blockchain.
            </p>

            <div className="flex items-center justify-center space-x-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-teal mb-1">&lt; 1s</div>
                <div className="text-sm text-gunmetal/60">Transaction time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-teal mb-1">$0.01</div>
                <div className="text-sm text-gunmetal/60">Average fee</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-teal mb-1">100%</div>
                <div className="text-sm text-gunmetal/60">Non-custodial</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-lavender-web py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Image
                src="/aptfy.png"
                alt="Aptfy Logo"
                width={16}
                height={16}
                className="h-4 w-4 opacity-60"
              />
              <span className="text-sm font-medium text-gunmetal/60" style={{ fontFamily: "'Outfit', sans-serif" }}>aptfy</span>
              <span className="text-sm text-gunmetal/60">© 2025</span>
            </div>

            <div className="flex items-center space-x-6">
              <Link href="/terms" className="text-sm text-gunmetal/60 hover:text-teal transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-sm text-gunmetal/60 hover:text-teal transition-colors">
                Privacy
              </Link>
              <Link href="https://github.com" className="text-sm text-gunmetal/60 hover:text-teal transition-colors">
                GitHub
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}