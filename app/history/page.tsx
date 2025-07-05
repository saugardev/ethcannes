'use client';

import PageLayout from '../components/page-layout';
import LoginGate from '../components/login-gate';
import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNexus } from "@avail-project/nexus";
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface MockTransaction {
  id: string;
  type: 'sent' | 'received';
  amount: string;
  address: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

function HistoryPage() {
  const { authenticated } = usePrivy();
  const { sdk } = useNexus();
  const [isInitialized, setIsInitialized] = useState(false);

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

  // Mock transaction data
  const mockTransactions: MockTransaction[] = [
    {
      id: '1',
      type: 'sent',
      amount: '25.50',
      address: '0x742d35Cc6634C0532925a3b8D40C9F347d3C5D7e',
      timestamp: '2024-01-15T10:30:00Z',
      status: 'completed'
    },
    {
      id: '2',
      type: 'received',
      amount: '100.00',
      address: '0x8ba1f109551bD432803012645Hac136c22C317e9',
      timestamp: '2024-01-14T15:45:00Z',
      status: 'completed'
    },
    {
      id: '3',
      type: 'sent',
      amount: '12.75',
      address: 'vitalik.eth',
      timestamp: '2024-01-13T09:20:00Z',
      status: 'completed'
    },
    {
      id: '4',
      type: 'received',
      amount: '50.00',
      address: '0x1234567890123456789012345678901234567890',
      timestamp: '2024-01-12T14:15:00Z',
      status: 'completed'
    },
    {
      id: '5',
      type: 'sent',
      amount: '75.25',
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      timestamp: '2024-01-11T11:00:00Z',
      status: 'pending'
    }
  ];

  const formatAddress = (address: string) => {
    if (address.endsWith('.eth')) {
      return address;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <PageLayout title="History">
      <LoginGate>
        <div className="p-4 sm:p-6 lg:p-8 space-y-4">
          <div className='text-text-primary opacity-70'>Transaction History</div>
          
          {!authenticated ? (
            <div className="bg-white p-6 rounded-lg text-center">
              <span className="text-gray-500">Connect wallet to view history</span>
            </div>
          ) : !isInitialized ? (
            <div className="bg-white p-6 rounded-lg text-center">
              <div className="loading loading-spinner loading-sm"></div>
              <span className="ml-2 text-gray-500">Loading...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {mockTransactions.map((transaction) => (
                <div key={transaction.id} className="bg-white p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${transaction.type === 'sent' ? 'bg-red-100' : 'bg-green-100'}`}>
                        {transaction.type === 'sent' ? (
                          <ArrowUpIcon className="w-4 h-4 text-red-600" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{transaction.type}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {transaction.type === 'sent' ? 'To: ' : 'From: '}
                          {formatAddress(transaction.address)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(transaction.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${transaction.type === 'sent' ? 'text-red-600' : 'text-green-600'}`}>
                        {transaction.type === 'sent' ? '-' : '+'}${transaction.amount}
                      </div>
                      <div className="text-xs text-gray-500">USDC</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </LoginGate>
    </PageLayout>
  );
}

export default function Page() {
  return <HistoryPage />;
}
