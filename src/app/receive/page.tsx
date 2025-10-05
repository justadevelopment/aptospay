"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Receive from "@/components/Receive";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";

export default function ReceivePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const email = sessionStorage.getItem("user_email");
    setUserEmail(email);

    if (!email) {
      router.push("/");
    }
  }, [router]);

  const handleSignOut = () => {
    sessionStorage.clear();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
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
                  href="/send"
                  className="text-gunmetal hover:text-teal transition-colors font-medium"
                >
                  Send
                </Link>

                <Link
                  href="/transactions"
                  className="text-gunmetal hover:text-teal transition-colors font-medium"
                >
                  Transactions
                </Link>

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
            ) : null}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="max-w-3xl mx-auto mb-8">
          <h1 className="text-4xl font-bold text-gunmetal mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Request Payment
          </h1>
          <p className="text-lg text-gunmetal/60">
            Generate payment links or QR codes to receive APT or USDC
          </p>
        </div>

        {/* Receive Component */}
        <div className="max-w-2xl mx-auto">
          <Receive showPaymentLink={true} />
        </div>

        {/* Features Section */}
        <section className="max-w-4xl mx-auto mt-16">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center group">
              <div className="w-16 h-16 bg-columbia-blue rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-teal transition-colors">
                <svg className="w-8 h-8 text-gunmetal group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal mb-2">Payment Links</h3>
              <p className="text-gunmetal/60 leading-relaxed">
                Generate shareable payment links instantly
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-columbia-blue rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-teal transition-colors">
                <svg className="w-8 h-8 text-gunmetal group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal mb-2">QR Codes</h3>
              <p className="text-gunmetal/60 leading-relaxed">
                Create scannable QR codes for payments
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-columbia-blue rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-teal transition-colors">
                <svg className="w-8 h-8 text-gunmetal group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal mb-2">Share Anywhere</h3>
              <p className="text-gunmetal/60 leading-relaxed">
                Send via email, WhatsApp, or any messenger
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-lavender-web py-12 mt-16">
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
