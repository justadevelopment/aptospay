"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Send from "@/components/Send";
import Receive from "@/components/Receive";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Reusable Header Component */}
      <Header />

      <main className="container mx-auto px-6">
        {/* Forms Section */}
        <section className="py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
            {/* Receive Component */}
            <div id="receive">
              <Receive />
            </div>

            {/* Send Component */}
            <div id="send">
              <Send />
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
