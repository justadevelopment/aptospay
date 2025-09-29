"use client";

import { useState } from "react";
import Link from "next/link";
import { validateEmail, validatePaymentAmount, sanitizeInput } from "@/lib/validation";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-blue-600">AptosPay</h1>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Send Money Without Wallets
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create payment links that anyone can claim using just their email.
            No crypto wallet required.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h3 className="text-2xl font-semibold mb-6">Create Payment Link</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (errors.amount) setErrors({ ...errors, amount: undefined });
                  }}
                  placeholder="50.00"
                  step="0.01"
                  min="0.01"
                  max="1000000"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
                )}
              </div>

              <div>
                <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  id="recipient"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    if (errors.recipient) setErrors({ ...errors, recipient: undefined });
                  }}
                  placeholder="alice@gmail.com"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.recipient ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.recipient && (
                  <p className="text-red-500 text-xs mt-1">{errors.recipient}</p>
                )}
              </div>

              <button
                onClick={generatePaymentLink}
                disabled={!amount || !recipient}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Generate Payment Link
              </button>
            </div>

            {paymentLink && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Payment Link Generated:</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={paymentLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Send this link to {recipient} to claim ${amount}
                </p>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-3xl mb-3">🔗</div>
              <h4 className="font-semibold mb-2">Create Link</h4>
              <p className="text-sm text-gray-600">Generate a payment link for any amount</p>
            </div>

            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-3xl mb-3">📧</div>
              <h4 className="font-semibold mb-2">Send to Anyone</h4>
              <p className="text-sm text-gray-600">Recipients use email to claim funds</p>
            </div>

            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-3xl mb-3">⚡</div>
              <h4 className="font-semibold mb-2">Instant Transfer</h4>
              <p className="text-sm text-gray-600">Powered by Aptos blockchain</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              View Dashboard →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}