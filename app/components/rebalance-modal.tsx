"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNexus } from "@avail-project/nexus";
import type { UserAsset, BridgeResult } from "@avail-project/nexus";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface RebalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: UserAsset[];
  onRebalanceComplete: () => void;
}

const SEPOLIA_CHAIN_ID = 11155111; // Sepolia chain ID in decimal
const NEXUS_FEE_PERCENTAGE = 0.02; // 2% fee

export default function RebalanceModal({
  isOpen,
  onClose,
  balances,
  onRebalanceComplete,
}: RebalanceModalProps) {
  const { authenticated } = usePrivy();
  const { sdk } = useNexus();
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [rebalanceResult, setRebalanceResult] = useState<BridgeResult | null>(
    null
  );
  const [error, setError] = useState<string>("");
  const [rebalanceAmount, setRebalanceAmount] = useState<number>(0);

  const calculateRebalanceAmount = useCallback(() => {
    const usdcBalance = balances.find((asset) => asset.symbol === "USDC");
    if (!usdcBalance?.breakdown) return 0;

    const totalBalance = parseFloat(usdcBalance.balance);

    // Find Sepolia balance
    const sepoliaBalance = usdcBalance.breakdown.find(
      (chainBreakdown) => chainBreakdown.chain.id === SEPOLIA_CHAIN_ID
    );
    const sepoliaAmount = sepoliaBalance
      ? parseFloat(sepoliaBalance.balance)
      : 0;

    // Calculate amount to rebalance (total - sepolia - fees)
    const amountToMove = totalBalance - sepoliaAmount;
    if (amountToMove <= 0) return 0;

    // Subtract 2% Nexus fees from the amount to move
    const finalAmount = amountToMove * (1 - NEXUS_FEE_PERCENTAGE);

    return Math.max(0, finalAmount);
  }, [balances]);

  useEffect(() => {
    if (isOpen) {
      const amount = calculateRebalanceAmount();
      setRebalanceAmount(amount);
      setError("");
      setRebalanceResult(null);
    }
  }, [isOpen, calculateRebalanceAmount]);

  const getNetworkBreakdown = () => {
    const usdcBalance = balances.find((asset) => asset.symbol === "USDC");
    if (!usdcBalance?.breakdown) return [];

    return usdcBalance.breakdown
      .filter((chainBreakdown) => chainBreakdown.chain.id !== SEPOLIA_CHAIN_ID)
      .filter((chainBreakdown) => parseFloat(chainBreakdown.balance) > 0);
  };

  const handleRebalance = async () => {
    if (!sdk || !authenticated || rebalanceAmount <= 0) return;

    setIsRebalancing(true);
    setError("");
    setRebalanceResult(null);

    try {
      // Bridge all non-Sepolia USDC to Sepolia
      const result: BridgeResult = await sdk.bridge({
        token: "USDC",
        amount: rebalanceAmount,
        chainId: SEPOLIA_CHAIN_ID,
      });

      setRebalanceResult(result);

      if (result.success) {
        console.log("✅ Rebalance successful!", result);

        // Call the callback to refresh balances
        setTimeout(() => {
          onRebalanceComplete();
        }, 2000);
      } else {
        console.error("❌ Rebalance failed:", result.error);
        setError(result.error || "Rebalance operation failed");
      }
    } catch (error) {
      console.error("❌ Rebalance error:", error);
      setError(
        error instanceof Error ? error.message : "Rebalance operation failed"
      );
    } finally {
      setIsRebalancing(false);
    }
  };

  const networkBreakdown = getNetworkBreakdown();
  const usdcBalance = balances.find((asset) => asset.symbol === "USDC");
  const totalBalance = usdcBalance ? parseFloat(usdcBalance.balance) : 0;
  const sepoliaBalance = usdcBalance?.breakdown?.find(
    (chainBreakdown) => chainBreakdown.chain.id === SEPOLIA_CHAIN_ID
  );
  const sepoliaAmount = sepoliaBalance ? parseFloat(sepoliaBalance.balance) : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Rebalance to Sepolia
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Current Balance Overview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Current Balance</h3>
            <div className="text-2xl font-bold text-gray-900">
              ${totalBalance.toFixed(2)} USDC
            </div>
            <div className="text-sm text-gray-600 mt-1">
              ${sepoliaAmount.toFixed(2)} on Sepolia
            </div>
          </div>

          {/* Network Breakdown */}
          {networkBreakdown.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                Funds to Move to Sepolia
              </h3>
              <div className="space-y-2">
                {networkBreakdown.map((chainBreakdown, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-gray-600">
                      {chainBreakdown.chain.name || "Unknown Network"}
                    </span>
                    <span className="font-medium text-gray-900">
                      ${parseFloat(chainBreakdown.balance).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rebalance Calculation */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">
              Rebalance Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount to move:</span>
                <span className="font-medium">
                  ${(totalBalance - sepoliaAmount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nexus fees (2%):</span>
                <span className="font-medium text-red-600">
                  -$
                  {(
                    (totalBalance - sepoliaAmount) *
                    NEXUS_FEE_PERCENTAGE
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-900 font-medium">
                  You'll receive:
                </span>
                <span className="font-bold text-green-600">
                  ${rebalanceAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Success Result */}
          {rebalanceResult && rebalanceResult.success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">
                ✅ Rebalance Successful!
              </h3>
              <p className="text-sm text-green-700">
                Your USDC has been successfully moved to Sepolia!
              </p>
              {rebalanceResult.explorerUrl && (
                <div className="mt-2">
                  <a
                    href={rebalanceResult.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 underline text-sm"
                  >
                    <span>View transaction</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && !rebalanceResult && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">❌ {error}</p>
            </div>
          )}

          {/* No funds to rebalance */}
          {rebalanceAmount <= 0 && !error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                💡 All your USDC is already on Sepolia or there are insufficient
                funds to rebalance after fees.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2 font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRebalance}
            disabled={isRebalancing || rebalanceAmount <= 0 || !authenticated}
            className="flex-1 bg-black text-white rounded-lg px-4 py-2 font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isRebalancing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Rebalancing...</span>
              </div>
            ) : (
              `Rebalance ${
                rebalanceAmount > 0 ? `$${rebalanceAmount.toFixed(2)}` : ""
              }`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
