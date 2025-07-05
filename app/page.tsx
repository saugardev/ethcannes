'use client';

import PageLayout from './components/page-layout';

import BridgeInterface from './components/bridge-interface';
import LoginGate from './components/login-gate';
import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNexus } from "@avail-project/nexus";
import type { UserAsset } from "@avail-project/nexus";
import { CreditCardIcon, ScaleIcon } from '@heroicons/react/24/outline';

function HomePage() {
  const { authenticated } = usePrivy();
  const { sdk } = useNexus();
  const [balances, setBalances] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);



  const checkInitialization = useCallback(async () => {
    if (!sdk) return false;

    try {
      await sdk.getUnifiedBalances();
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("CA not initialized")
      ) {
        return false;
      }
      return true;
    }
  }, [sdk]);

  const fetchBalances = useCallback(async () => {
    if (!authenticated || !sdk || !isInitialized) return;

    setLoading(true);
    try {
      const unifiedBalances = await sdk.getUnifiedBalances();
      setBalances(unifiedBalances);
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    } finally {
      setLoading(false);
    }
  }, [authenticated, sdk, isInitialized]);

  useEffect(() => {
    const checkInit = async () => {
      if (sdk) {
        const initialized = await checkInitialization();
        setIsInitialized(initialized);
      }
    };

    checkInit();
    const interval = setInterval(checkInit, 1000);
    return () => clearInterval(interval);
  }, [sdk, checkInitialization]);

  useEffect(() => {
    if (isInitialized) {
      fetchBalances();
    }
  }, [authenticated, sdk, isInitialized, fetchBalances]);

  // Get USDC balance
  const usdcBalance = balances.find(asset => asset.symbol === 'USDC');
  const usdcAmount = usdcBalance ? parseFloat(usdcBalance.balance) : 0;

  return (
    <PageLayout title="Buddy">
      <LoginGate>
        <div className="p-4 sm:p-6 lg:p-8 space-y-4">
          <div className='text-text-primary opacity-70'>Your Balance</div>
          
          {/* USDC Balance Card */}
          <div>
            <div 
              className={`bg-white p-4 cursor-pointer transition-all duration-200 ${isExpanded ? 'rounded-t-lg' : 'rounded-lg'}`}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {!authenticated ? (
                    <span className="text-gray-500">Connect wallet</span>
                  ) : !isInitialized ? (
                    <div className="loading loading-spinner loading-sm"></div>
                  ) : (
                    <span className="text-2xl font-bold text-gray-900">
                      ${usdcAmount.toFixed(2)}
                    </span>
                  )}
                  <span className="">USDC</span>
                </div>
                <svg 
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && authenticated && isInitialized && (
              <div className="bg-card-background rounded-b-lg p-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm">Network Breakdown</h3>
                </div>

                {usdcBalance?.breakdown && usdcBalance.breakdown.length > 0 ? (
                  <div className='mt-2'>
                    {usdcBalance.breakdown.map((chainBreakdown, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-base-300 last:border-b-0">
                        <span className="text-xs text-base-content/70">
                          {chainBreakdown.chain.name || 'Unknown Network'}
                        </span>
                        <span className="text-xs font-medium text-base-content">
                          ${parseFloat(chainBreakdown.balance).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-base-content/70 text-center py-4">
                    No network breakdown available
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button className="bg-black text-white rounded-full px-6 py-3 flex items-center justify-center gap-2 font-medium transition-all duration-200 hover:bg-gray-800 active:scale-95 flex-1">
                <span className="text-lg"><ScaleIcon className='w-5 h-5'/></span>
                <span>Rebalance</span>
              </button>
              <button className="bg-white text-gray-900 rounded-full px-6 py-3 flex items-center justify-center gap-2 font-medium transition-all duration-200 hover:bg-gray-50 active:scale-95 flex-1">
                <span className="text-lg"><CreditCardIcon className='w-5 h-5'/></span>
                <span>Add Card</span>
              </button>
            </div>
          </div>
        </div>
      </LoginGate>
    </PageLayout>
  );
}

export default function Page() {
  return <HomePage />;
}