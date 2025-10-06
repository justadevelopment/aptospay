"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import VestingStreams from "@/components/defi/VestingStreams";
import EscrowV2Component from "@/components/defi/EscrowV2";
import P2PLending from "@/components/defi/P2PLending";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";

type Tab = "vesting" | "escrow" | "lending";

function DeFiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial tab from URL params or sessionStorage, default to 'vesting'
  const getInitialTab = (): Tab => {
    const urlTab = searchParams.get("tab") as Tab;
    if (urlTab && ["vesting", "escrow", "lending"].includes(urlTab)) {
      return urlTab;
    }

    const savedTab = sessionStorage.getItem("defi_active_tab") as Tab;
    if (savedTab && ["vesting", "escrow", "lending"].includes(savedTab)) {
      return savedTab;
    }

    return "vesting";
  };

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab());
  const [address, setAddress] = useState<string>("");

  useEffect(() => {
    const storedAddress = sessionStorage.getItem("aptos_address");
    if (!storedAddress) {
      router.push("/");
      return;
    }
    setAddress(storedAddress);
  }, [router]);

  // Update URL and sessionStorage when tab changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    sessionStorage.setItem("defi_active_tab", tab);

    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gunmetal mb-3">DeFi Protocols</h1>
          <p className="text-lg text-gunmetal/60">
            Vesting streams, escrow services, and P2P lending - all powered by Aptos
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-lavender-web">
          <button
            onClick={() => handleTabChange("vesting")}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === "vesting"
                ? "text-teal border-b-2 border-teal"
                : "text-gunmetal/60 hover:text-gunmetal"
            }`}
          >
            Vesting Streams
            <span className="ml-2 px-2 py-0.5 bg-teal/10 text-teal text-xs rounded-full">
              Time-based
            </span>
          </button>
          <button
            onClick={() => handleTabChange("escrow")}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === "escrow"
                ? "text-teal border-b-2 border-teal"
                : "text-gunmetal/60 hover:text-gunmetal"
            }`}
          >
            Escrow V2
            <span className="ml-2 px-2 py-0.5 bg-columbia-blue/30 text-gunmetal text-xs rounded-full">
              3 Types
            </span>
          </button>
          <button
            onClick={() => handleTabChange("lending")}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === "lending"
                ? "text-teal border-b-2 border-teal"
                : "text-gunmetal/60 hover:text-gunmetal"
            }`}
          >
            P2P Lending
            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              Earn Interest
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === "vesting" && <VestingStreams address={address} />}
          {activeTab === "escrow" && <EscrowV2Component address={address} />}
          {activeTab === "lending" && <P2PLending address={address} />}
        </div>

        {/* Info Section */}
        <div className="mt-16 p-6 bg-gradient-to-br from-teal/5 to-columbia-blue/10 border-2 border-teal/20 rounded-2xl">
          <h3 className="text-xl font-bold text-gunmetal mb-4">About DeFi Protocols</h3>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gunmetal mb-2">🕐 Vesting Streams</h4>
              <p className="text-sm text-gunmetal/70 leading-relaxed">
                Create token vesting schedules with optional cliff periods. Perfect for team allocations,
                investor distributions, or any time-based payment schedule.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gunmetal mb-2">🔒 Escrow V2</h4>
              <p className="text-sm text-gunmetal/70 leading-relaxed">
                Hold funds securely with three types: Standard (basic), Time-Locked (with deadlines),
                and Arbitrated (with third-party mediator for disputes).
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gunmetal mb-2">💰 P2P Lending</h4>
              <p className="text-sm text-gunmetal/70 leading-relaxed">
                Supply APT to earn interest or borrow against collateral. Dynamic rates based on pool
                utilization with over-collateralized loans (75% LTV).
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DeFiPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <DeFiContent />
    </Suspense>
  );
}
