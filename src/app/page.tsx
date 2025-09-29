"use client";

import { useState } from "react";
import Link from "next/link";
import { validateEmail, validatePaymentAmount, sanitizeInput } from "@/lib/validation";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

export default function Home() {
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; recipient?: string }>({});

  const generatePaymentLink = () => {
    // Reset errors
    setErrors({});

    // Validate inputs
    const amountValidation = validatePaymentAmount(amount);
    const emailValidation = validateEmail(recipient);

    const newErrors: { amount?: string; recipient?: string } = {};

    if (!amountValidation.isValid) {
      newErrors.amount = amountValidation.error;
    }

    if (!emailValidation.isValid) {
      newErrors.recipient = emailValidation.error;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Sanitize inputs
    const sanitizedAmount = sanitizeInput(amount);
    const sanitizedRecipient = sanitizeInput(recipient).toLowerCase();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const link = `${baseUrl}/pay/$${sanitizedAmount}/to/${sanitizedRecipient}`;
    setPaymentLink(link);
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
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AP</span>
            </div>
            <span className="text-xl font-semibold text-gunmetal">AptosPay</span>
          </div>

          <div className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-gunmetal hover:text-teal transition-colors font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/docs"
              className="text-gunmetal hover:text-teal transition-colors font-medium"
            >
              Docs
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6">
        {/* Hero Section */}
        <section className="py-20 text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gunmetal mb-6 leading-tight">
            Send money to anyone,<br />
            <span className="text-teal">no wallet required</span>
          </h1>
          <p className="text-xl text-gunmetal/70 mb-12 leading-relaxed">
            Create payment links that work with just an email address.
            Recipients claim funds instantly using Google sign-in.
          </p>
        </section>

        {/* Payment Form Card */}
        <section className="max-w-2xl mx-auto pb-20">
          <div className="bg-white border-2 border-lavender-web rounded-2xl p-8 shadow-sm">
            <div className="space-y-6">
              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gunmetal mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gunmetal/50 font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (errors.amount) setErrors({ ...errors, amount: undefined });
                    }}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max="1000000"
                    className={`w-full pl-10 pr-4 py-4 text-lg border-2 rounded-xl focus:outline-none transition-colors ${
                      errors.amount
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-lavender-web focus:border-teal'
                    }`}
                  />
                </div>
                {errors.amount && (
                  <p className="text-red-500 text-sm mt-2 animate-slideIn">{errors.amount}</p>
                )}
              </div>

              {/* Recipient Input */}
              <div>
                <label className="block text-sm font-medium text-gunmetal mb-2">
                  Recipient email
                </label>
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    if (errors.recipient) setErrors({ ...errors, recipient: undefined });
                  }}
                  placeholder="alice@example.com"
                  className={`w-full px-4 py-4 text-lg border-2 rounded-xl focus:outline-none transition-colors ${
                    errors.recipient
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-lavender-web focus:border-teal'
                  }`}
                />
                {errors.recipient && (
                  <p className="text-red-500 text-sm mt-2 animate-slideIn">{errors.recipient}</p>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={generatePaymentLink}
                disabled={!amount || !recipient}
                className="w-full py-4 bg-gunmetal text-white rounded-xl font-semibold text-lg hover:bg-gunmetal/90 disabled:bg-lavender-web disabled:text-gunmetal/30 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
              >
                Generate payment link
              </button>
            </div>

            {/* Generated Link */}
            {paymentLink && (
              <div className="mt-8 p-6 bg-columbia-blue/30 border-2 border-columbia-blue rounded-xl animate-fadeIn">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gunmetal">Payment link ready</span>
                  <span className="text-xs bg-teal text-white px-3 py-1 rounded-full">
                    Active
                  </span>
                </div>

                <div className="flex items-center space-x-3">
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

                <p className="text-sm text-gunmetal/60 mt-3">
                  Send this link to <span className="font-medium text-gunmetal">{recipient}</span> to receive <span className="font-medium text-gunmetal">${amount}</span>
                </p>
              </div>
            )}
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
              Powered by Aptos Keyless Accounts
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
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-teal rounded-md"></div>
              <span className="text-sm text-gunmetal/60">© 2025 AptosPay</span>
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