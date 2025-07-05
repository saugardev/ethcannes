'use client';

import PageLayout from '../components/page-layout';
import LoginGate from '../components/login-gate';
import BlackButton from '../components/black-button';
import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNexus } from "@avail-project/nexus";
import type { UserAsset } from "@avail-project/nexus";
import { PaperAirplaneIcon, QrCodeIcon } from '@heroicons/react/24/outline';

function SendPage() {
  const { authenticated } = usePrivy();
  const { sdk } = useNexus();
  const [balances, setBalances] = useState<UserAsset[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);

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

  const handleSend = async () => {
    if (!amount || !recipient || !sdk || !authenticated) return;
    
    setIsLoading(true);
    try {
      // TODO: Implement actual send logic with SDK
      console.log('Sending:', { amount, recipient });
      // await sdk.send(...)
    } catch (error) {
      console.error('Send failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidAmount = amount && parseFloat(amount) > 0 && parseFloat(amount) <= usdcAmount;
  const isValidRecipient = recipient && (recipient.startsWith('0x') || recipient.endsWith('.eth'));

  const handleQrScan = async () => {
    try {
      // Request camera permission and access
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setShowQrScanner(true);
      
      // In a real implementation, you would use a QR code scanner library like 'qr-scanner'
      // For now, this is a placeholder that simulates scanning
      setTimeout(() => {
        // Mock QR code data - in reality this would come from the scanner
        const mockQrData = "ethereum:0x742d35Cc6634C0532925a3b8D40C9F347d3C5D7e?value=25.5";
        parseQrCode(mockQrData);
        setShowQrScanner(false);
        stream.getTracks().forEach(track => track.stop());
      }, 2000);
    } catch (error) {
      console.error('Camera access denied or not supported:', error);
      alert('Camera access is required to scan QR codes');
    }
  };

  const parseQrCode = (qrData: string) => {
    try {
      // Parse ethereum URI format: ethereum:address?value=amount
      if (qrData.startsWith('ethereum:')) {
        const url = new URL(qrData);
        const address = url.pathname;
        const value = url.searchParams.get('value');
        
        if (address) {
          setRecipient(address);
        }
        if (value) {
          setAmount(value);
        }
      } else if (qrData.startsWith('0x') || qrData.endsWith('.eth')) {
        // Simple address format
        setRecipient(qrData);
      }
    } catch (error) {
      console.error('Invalid QR code format:', error);
    }
  };

  return (
    <PageLayout title="Send">
      <LoginGate>
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 relative">
          <div className='text-text-primary opacity-70'>Send USDC</div>
          
          {/* Balance Display */}
          <div className="bg-white p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Available Balance</span>
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
              Amount
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
                max={usdcAmount.toString()}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                USDC
              </div>
            </div>
            {amount && parseFloat(amount) > usdcAmount && (
              <p className="text-sm text-red-600">Insufficient balance</p>
            )}
          </div>

          {/* Recipient Input */}
          <div className="bg-white p-4 rounded-lg space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Send to
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0xabc... or name.eth"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
            {recipient && !isValidRecipient && (
              <p className="text-sm text-red-600">Please enter a valid address or ENS name</p>
            )}
          </div>

          {/* Send Button */}
          <div className="flex gap-3">
            <BlackButton
              onClick={handleSend}
              disabled={!isValidAmount || !isValidRecipient || isLoading || !authenticated || !isInitialized}
              className="flex-1"
              icon={isLoading ? <div className="loading loading-spinner loading-sm"></div> : <PaperAirplaneIcon className='w-5 h-5'/>}
            >
              Send
            </BlackButton>
            <button
              onClick={handleQrScan}
              disabled={!authenticated || !isInitialized}
              className="bg-white w-12 h-12 rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <QrCodeIcon className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* QR Scanner Modal */}
          {showQrScanner && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Scanning QR Code</h3>
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <div className="loading loading-spinner loading-lg"></div>
                  <p className="mt-4 text-gray-600">Point your camera at the QR code</p>
                </div>
                <button
                  onClick={() => setShowQrScanner(false)}
                  className="mt-4 w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </LoginGate>
    </PageLayout>
  );
}

export default function Page() {
  return <SendPage />;
}