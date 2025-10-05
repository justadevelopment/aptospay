"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Send from "@/components/Send";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";

export default function SendPage() {
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
                  href="/receive"
                  className="text-gunmetal hover:text-teal transition-colors font-medium"
                >
                  Receive
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
            Send Payment
          </h1>
          <p className="text-lg text-gunmetal/60">
            Send APT or USDC to anyone with an email address or wallet address
          </p>
        </div>

        {/* Send Component */}
        <div className="max-w-2xl mx-auto">
          <Send />
        </div>

        {/* Features Section */}
        <section className="max-w-4xl mx-auto mt-16">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center group">
              <div className="w-16 h-16 bg-columbia-blue rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-teal transition-colors">
                <svg className="w-8 h-8 text-gunmetal group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal mb-2">Instant Transfer</h3>
              <p className="text-gunmetal/60 leading-relaxed">
                Sub-second finality on Aptos blockchain
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-columbia-blue rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-teal transition-colors">
                <svg className="w-8 h-8 text-gunmetal group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal mb-2">Email or Address</h3>
              <p className="text-gunmetal/60 leading-relaxed">
                Send to email addresses or wallet addresses
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-columbia-blue rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-teal transition-colors">
                <svg className="w-8 h-8 text-gunmetal group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gunmetal mb-2">Secure</h3>
              <p className="text-gunmetal/60 leading-relaxed">
                Non-custodial with Aptos Keyless accounts
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
