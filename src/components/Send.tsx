"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { validatePaymentAmount } from "@/lib/validation";
import { TokenSymbol, getSupportedTokens } from "@/lib/tokens";
import { getKeylessAccount } from "@/lib/keyless";
import { transfer, getBalance } from "@/lib/aptos";
import TransactionLink from "./TransactionLink";

export default function Send() {
  const [sendAmount, setSendAmount] = useState("");
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendToken, setSendToken] = useState<TokenSymbol>("APT");
  const [sendErrors, setSendErrors] = useState<{ amount?: string; recipient?: string }>({});
  const [sendLoading, setSendLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const email = sessionStorage.getItem("user_email");
    const address = sessionStorage.getItem("aptos_address");
    setUserEmail(email);
    setUserAddress(address);
    if (address) {
      fetchBalance(address, sendToken);
    }
  }, []);

  // Fetch balance when token changes
  useEffect(() => {
    if (userAddress) {
      fetchBalance(userAddress, sendToken);
    }
  }, [sendToken, userAddress]);

  const fetchBalance = async (address: string, token: TokenSymbol) => {
    setLoadingBalance(true);
    try {
      const tokenBalance = await getBalance(address, token);
      setBalance(tokenBalance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleSend = async () => {
    // Check if signed in
    if (!userEmail || !userAddress) {
      setSendErrors({ amount: "Please sign in to send payments" });
      return;
    }

    // Validate
    const amountValidation = validatePaymentAmount(sendAmount, sendToken);
    if (!amountValidation.isValid) {
      setSendErrors({ amount: amountValidation.error });
      return;
    }

    // Detect email vs address
    const aptosAddressRegex = /^0x[a-fA-F0-9]{64}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isAddress = aptosAddressRegex.test(sendRecipient.trim());
    const isEmail = emailRegex.test(sendRecipient.trim());

    if (!isAddress && !isEmail) {
      setSendErrors({ recipient: "Enter a valid email or Aptos address" });
      return;
    }

    setSendLoading(true);
    setSendErrors({});

    try {
      // Get keyless account from client-side storage
      const keylessAccount = await getKeylessAccount();

      if (!keylessAccount) {
        setSendErrors({ amount: "Please sign in again to send payments" });
        setSendLoading(false);
        return;
      }

      let recipientAddr = sendRecipient.trim();

      // If email, resolve to address
      if (isEmail) {
        const resolveResponse = await fetch("/api/resolve-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: sendRecipient.trim() }),
        });

        const resolveData = await resolveResponse.json();

        if (!resolveResponse.ok) {
          setSendErrors({ recipient: resolveData.error });
          setSendLoading(false);
          return;
        }

        recipientAddr = resolveData.aptosAddress;
      }

      // Execute transfer directly from client
      const transactionHash = await transfer(
        keylessAccount,
        recipientAddr,
        parseFloat(sendAmount),
        sendToken
      );

      setSuccessTxHash(transactionHash);
      setSendAmount("");
      setSendRecipient("");

      // Clear success message after 10 seconds
      setTimeout(() => setSuccessTxHash(null), 10000);
    } catch (error) {
      console.error("Send error:", error);
      setSendErrors({ amount: error instanceof Error ? error.message : "Failed to send" });
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="perspective-1000">
      <div className="bg-white border border-lavender-web/30 rounded-2xl p-5 h-full flex flex-col relative overflow-hidden transform-style-3d transition-all duration-500 hover:shadow-[0_20px_60px_0_rgba(16,39,112,0.15)] shadow-[0_12px_35px_0_rgba(16,39,112,0.07)]">
        <div className="absolute inset-0 bg-gradient-to-br from-columbia-blue/5 via-transparent to-teal/10 opacity-60"></div>
        <div className="relative z-10">
          <h3 className="text-xs font-semibold text-gunmetal mb-4 uppercase tracking-wide">Send</h3>

          {/* Success Message */}
          {successTxHash && (
            <div className="mb-4 p-3 bg-teal/5 border-2 border-teal/30 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-5 h-5 bg-teal/10 rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gunmetal mb-1">✅ Sent successfully!</p>
                  <p className="text-[9px] text-gunmetal/60 uppercase tracking-wide mb-1">Transaction Hash</p>
                  <TransactionLink txHash={successTxHash} className="text-[10px]" />
                </div>
              </div>
            </div>
          )}

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

              {/* Balance Display - Small */}
              {userAddress && (
                <div className="mt-2 flex items-center justify-between px-2 py-1.5 bg-gunmetal/5 rounded-lg">
                  <span className="text-[9px] text-gunmetal/60 uppercase tracking-wide">Available</span>
                  <div className="flex items-center gap-1.5">
                    <Image
                      src={sendToken === 'APT' ? "/aptos-apt-logo.svg" : "/usd-coin-usdc-logo.svg"}
                      alt={sendToken}
                      width={14}
                      height={14}
                      className="w-3.5 h-3.5"
                    />
                    {loadingBalance ? (
                      <div className="w-16 h-3 bg-gunmetal/10 animate-pulse rounded"></div>
                    ) : (
                      <span className="text-xs font-bold text-gunmetal">
                        {balance !== null ? `${balance.toFixed(4)} ${sendToken}` : `-.-- ${sendToken}`}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-[9px] font-semibold text-gunmetal mb-1 uppercase tracking-wide">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => {
                    setSendAmount(e.target.value);
                    if (sendErrors.amount) setSendErrors({ ...sendErrors, amount: undefined });
                  }}
                  placeholder="0.00"
                  step={sendToken === 'USDC' ? "0.000001" : "0.00000001"}
                  min="0.000001"
                  max="1000000"
                  className={`w-full pl-3 pr-12 py-2 text-sm border-2 rounded-lg focus:outline-none transition-colors ${
                    sendErrors.amount
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-lavender-web focus:border-teal'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gunmetal/50 font-medium text-xs">
                  {sendToken}
                </span>
              </div>
              {sendErrors.amount && (
                <p className="text-red-500 text-[9px] mt-0.5">{sendErrors.amount}</p>
              )}
            </div>

            {/* Recipient Input - Email or Address */}
            <div>
              <label className="block text-[9px] font-semibold text-gunmetal mb-1 uppercase tracking-wide">
                Recipient (Email or Address)
              </label>
              <input
                type="text"
                value={sendRecipient}
                onChange={(e) => {
                  setSendRecipient(e.target.value);
                  if (sendErrors.recipient) setSendErrors({ ...sendErrors, recipient: undefined });
                }}
                placeholder="alice@example.com or 0x..."
                className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none transition-colors ${
                  sendErrors.recipient
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-lavender-web focus:border-teal'
                }`}
              />
              {sendErrors.recipient && (
                <p className="text-red-500 text-[9px] mt-0.5">{sendErrors.recipient}</p>
              )}
            </div>

            {/* Send Button - Direct Transfer */}
            <button
              onClick={handleSend}
              disabled={!sendAmount || !sendRecipient || sendLoading}
              className="w-full py-2.5 bg-gunmetal text-white rounded-lg font-semibold text-xs hover:bg-gunmetal/90 disabled:bg-lavender-web disabled:text-gunmetal/30 transition-all"
            >
              {sendLoading ? "Sending..." : "Send"}
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
      </div>
    </div>
  );
}
