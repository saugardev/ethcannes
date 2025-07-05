'use client';

import PageLayout from '../components/page-layout';
import LoginGate from '../components/login-gate';
import BlackButton from '../components/black-button';
import QrModal from '../components/qr-modal';
import NfcModal from '../components/nfc-modal';
import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNexus } from "@avail-project/nexus";
import type { UserAsset } from "@avail-project/nexus";
import { QrCodeIcon, WifiIcon } from '@heroicons/react/24/outline';

function ReceivePage() {
  const { authenticated, user } = usePrivy();
  const { sdk } = useNexus();
  const [balances, setBalances] = useState<UserAsset[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [amount, setAmount] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showNfcModal, setShowNfcModal] = useState(false);

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

    try {
      const unifiedBalances = await sdk.getUnifiedBalances();
      setBalances(unifiedBalances);
    } catch (error) {
      console.error("Failed to fetch balances:", error);
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

  const handleQrPayment = async () => {
    if (!amount || !authenticated || !isInitialized) return;
    setShowQrModal(true);
  };

  const handleNfcPayment = async () => {
    if (!amount || !authenticated || !isInitialized) return;
    setShowNfcModal(true);
  };

  const isValidAmount = amount && parseFloat(amount) > 0;
  
  // Get user's wallet address
  const userAddress = user?.wallet?.address || 'Your Address';

  return (
    <PageLayout title="Receive">
      <LoginGate>
        <div className="p-4 sm:p-6 lg:p-8 space-y-4">
          <div className='text-text-primary opacity-70'>Receive USDC</div>
          
          {/* Balance Display */}
          <div className="bg-white p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Current Balance</span>
              {!authenticated ? (
                <span className="text-gray-500">Connect wallet</span>
              ) : !isInitialized ? (
                <div className="loading loading-spinner loading-sm"></div>
              ) : (
                <span className="text-lg font-bold text-gray-900">
                  ${usdcAmount.toFixed(2)} USDC
                </span>
              )}
            </div>
          </div>

          {/* Amount Input */}
          <div className="bg-white p-4 rounded-lg space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Amount to Receive
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-lg"
                step="0.01"
                min="0"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                USDC
              </div>
            </div>
          </div>

          {/* Payment Method Buttons */}
          <div className="flex gap-3">
            <BlackButton
              onClick={handleQrPayment}
              disabled={!isValidAmount || !authenticated || !isInitialized}
              className="flex-1"
              icon={<QrCodeIcon className='w-5 h-5'/>}
            >
              QR Code
            </BlackButton>
            <button
              onClick={handleNfcPayment}
              disabled={!isValidAmount || !authenticated || !isInitialized}
              className="bg-white text-gray-900 rounded-full px-6 py-3 flex items-center justify-center gap-2 font-medium transition-all duration-200 hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
            >
              <WifiIcon className='w-5 h-5'/>
              <span>NFC</span>
            </button>
          </div>

          {/* Modals */}
          <QrModal
            isOpen={showQrModal}
            onClose={() => {
              setShowQrModal(false);
            }}
            amount={amount}
            address={userAddress}
          />
          <NfcModal
            isOpen={showNfcModal}
            onClose={() => {
              setShowNfcModal(false);
            }}
            amount={amount}
            address={userAddress}
          />
        </div>
      </LoginGate>
    </PageLayout>
  );
}

export default function Page() {
  return <ReceivePage />;
} 