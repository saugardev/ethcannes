"use client";

import PageLayout from "../components/page-layout";
import LoginGate from "../components/login-gate";
import BlackButton from "../components/black-button";
import { useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useNexus } from "@avail-project/nexus";
import type {
  UserAsset,
  TransferParams,
  TransferResult,
  SimulationResult,
} from "@avail-project/nexus";
import {
  PaperAirplaneIcon,
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import {
  createPublicClient,
  http,
  parseAbi,
  createWalletClient,
  custom,
  parseUnits,
  isAddress,
} from "viem";
import { sepolia } from "viem/chains";
import { normalize } from "viem/ens";

// Testnet chains supported by Nexus
const SUPPORTED_CHAINS = [
  { id: 11155420, name: "Optimism Sepolia", symbol: "ETH" },
  { id: 80002, name: "Polygon Amoy", symbol: "MATIC" },
  { id: 421614, name: "Arbitrum Sepolia", symbol: "ETH" },
  { id: 84532, name: "Base Sepolia", symbol: "ETH" },
  { id: 11155111, name: "Ethereum Sepolia", symbol: "ETH" },
];

const TRANSFER_TOKEN = "USDC";

function SendPage() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { sdk } = useNexus();
  const [balances, setBalances] = useState<UserAsset[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>("");
  const [addressError, setAddressError] = useState<string>("");

  // Cross-chain transfer states
  const [isCrossChain, setIsCrossChain] = useState(false);
  const [targetChainId, setTargetChainId] = useState<number>(11155420); // Default to Optimism Sepolia
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Confirmation modal states
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<
    "pending" | "success" | "error" | null
  >(null);
  const [transactionHash, setTransactionHash] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [transferResult, setTransferResult] = useState<TransferResult | null>(
    null
  );

  // Contract Configuration
  const SEPOLIA_RPC_URL = "https://sepolia.drpc.org";
  const USDC_CONTRACT_ADDRESS =
    "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238" as const;
  const SUBNAME_REGISTRAR_ADDRESS =
    "0x9a02a25036A70D53663CDf30335169e734E319B1" as const;

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC_URL),
  });

  const USDC_ABI = parseAbi([
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ]);

  const SUBNAME_REGISTRAR_ABI = parseAbi([
    "function usernameToAddress(string) view returns (address)",
  ]);

  // Switch to Sepolia network
  const switchToSepolia = async () => {
    const connectedWallet = wallets.find(
      (wallet) => wallet.walletClientType === "privy"
    );
    if (!connectedWallet) return;

    const provider = await connectedWallet.getEthereumProvider();
    if (!provider) return;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], // Sepolia chain ID
      });
    } catch (error: any) {
      if (error.code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0xaa36a7",
              chainName: "Sepolia",
              nativeCurrency: {
                name: "Ethereum",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: ["https://sepolia.drpc.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      }
    }
  };

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
  }, []); // Remove sdk dependency to prevent re-creation

  const fetchBalances = useCallback(async () => {
    if (!authenticated || !sdk || !isInitialized) return;

    try {
      const unifiedBalances = await sdk.getUnifiedBalances();
      setBalances(unifiedBalances);
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    }
  }, [authenticated, isInitialized]); // Remove sdk dependency to prevent re-creation

  // Resolve address from various formats
  const resolveRecipientAddress = useCallback(
    async (input: string) => {
      if (!input) {
        setResolvedAddress("");
        setAddressError("");
        return;
      }

      setIsResolvingAddress(true);
      setAddressError("");

      try {
        // If it's already a valid address
        if (isAddress(input)) {
          setResolvedAddress(input);
          return;
        }

        // Handle @username format (buddy.eth subdomain)
        if (input.startsWith("@")) {
          const username = input.slice(1); // Remove @
          try {
            const address = await publicClient.readContract({
              address: SUBNAME_REGISTRAR_ADDRESS,
              abi: SUBNAME_REGISTRAR_ABI,
              functionName: "usernameToAddress",
              args: [username],
            });

            if (
              address &&
              address !== "0x0000000000000000000000000000000000000000"
            ) {
              setResolvedAddress(address);
              return;
            } else {
              setAddressError(`@${username} subdomain not found`);
              setResolvedAddress("");
              return;
            }
          } catch (error) {
            console.error("Error resolving subdomain:", error);
            setAddressError(`Failed to resolve @${username}`);
            setResolvedAddress("");
            return;
          }
        }

        // Handle regular ENS names
        if (input.includes(".eth")) {
          try {
            const normalizedName = normalize(input);
            const address = await publicClient.getEnsAddress({
              name: normalizedName,
            });

            if (address) {
              setResolvedAddress(address);
              return;
            } else {
              setAddressError(`ENS name ${input} not found`);
              setResolvedAddress("");
              return;
            }
          } catch (error) {
            console.error("Error resolving ENS:", error);
            setAddressError(`Failed to resolve ${input}`);
            setResolvedAddress("");
            return;
          }
        }

        // If none of the above formats match
        setAddressError("Please enter a valid address, ENS name, or @username");
        setResolvedAddress("");
      } catch (error) {
        console.error("Error resolving address:", error);
        setAddressError("Failed to resolve address");
        setResolvedAddress("");
      } finally {
        setIsResolvingAddress(false);
      }
    },
    [] // Remove publicClient dependency to prevent re-creation
  );

  // Simulate cross-chain transfer when parameters change
  useEffect(() => {
    const simulateTransfer = async () => {
      if (
        !isCrossChain ||
        !sdk ||
        !isInitialized ||
        !amount ||
        parseFloat(amount) <= 0 ||
        !resolvedAddress ||
        addressError
      ) {
        setSimulation(null);
        return;
      }

      setIsSimulating(true);

      try {
        // Check if user has sufficient balance before simulation
        const usdcBalance = balances.find((asset) => asset.symbol === "USDC");
        if (
          !usdcBalance ||
          parseFloat(usdcBalance.balance) < parseFloat(amount)
        ) {
          console.warn("Insufficient balance for simulation");
          setSimulation(null);
          return;
        }

        const result = await sdk.simulateTransfer({
          token: TRANSFER_TOKEN,
          amount: parseFloat(amount),
          chainId: targetChainId as any,
          recipient: resolvedAddress,
        } as TransferParams);
        setSimulation(result);
      } catch (error) {
        console.error("Simulation failed:", error);

        // Handle specific error cases
        if (error instanceof Error) {
          if (error.message.includes("ca not applicable")) {
            console.warn(
              "Cross-chain account not applicable for this transfer. This may be due to insufficient balance on source chains or unsupported chain combination."
            );
          } else if (error.message.includes("CA not initialized")) {
            console.warn(
              "Cross-chain account not initialized. Please wait for initialization to complete."
            );
          }
        }

        setSimulation(null);
      } finally {
        setIsSimulating(false);
      }
    };

    // Debounce simulation calls
    const timer = setTimeout(simulateTransfer, 500);
    return () => clearTimeout(timer);
  }, [
    sdk,
    isInitialized,
    amount,
    resolvedAddress,
    addressError,
    targetChainId,
    isCrossChain,
    balances, // Add balances dependency
  ]);

  // Debounced address resolution
  useEffect(() => {
    if (!recipient) {
      setResolvedAddress("");
      setAddressError("");
      return;
    }

    const timer = setTimeout(() => {
      resolveRecipientAddress(recipient);
    }, 500);
    return () => clearTimeout(timer);
  }, [recipient]); // Remove resolveRecipientAddress dependency

  useEffect(() => {
    const checkInit = async () => {
      if (sdk) {
        const initialized = await checkInitialization();
        setIsInitialized(initialized);
      }
    };

    checkInit();
    // Only set interval if not initialized yet
    if (!isInitialized) {
      const interval = setInterval(checkInit, 2000); // Reduced frequency
      return () => clearInterval(interval);
    }
  }, [sdk, isInitialized]); // Remove checkInitialization dependency

  useEffect(() => {
    if (isInitialized && authenticated && sdk) {
      fetchBalances();
    }
  }, [authenticated, isInitialized]); // Remove sdk and fetchBalances dependencies

  // Get USDC balance
  const usdcBalance = balances.find((asset) => asset.symbol === "USDC");
  const usdcAmount = usdcBalance ? parseFloat(usdcBalance.balance) : 0;

  const handleSendClick = () => {
    if (
      !amount ||
      !resolvedAddress ||
      !authenticated ||
      !user?.wallet?.address
    ) {
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmSend = async () => {
    if (
      !amount ||
      !resolvedAddress ||
      !authenticated ||
      !user?.wallet?.address
    ) {
      return;
    }

    setTransactionStatus("pending");
    setIsLoading(true);

    try {
      if (isCrossChain) {
        // Use Nexus for cross-chain transfer
        const result: TransferResult = await sdk.transfer({
          token: TRANSFER_TOKEN,
          amount: parseFloat(amount),
          chainId: targetChainId as any,
          recipient: resolvedAddress,
        } as TransferParams);

        setTransferResult(result);

        if (result.success) {
          console.log("✅ Cross-chain transfer successful!", result);
          setTransactionStatus("success");
          if (result.explorerUrl) {
            setTransactionHash(result.explorerUrl);
          }

          // Refresh balances after successful transaction
          setTimeout(() => {
            fetchBalances();
          }, 2000);
        } else {
          console.error("❌ Cross-chain transfer failed:", result.error);
          setTransactionStatus("error");
          setErrorMessage(result.error || "Cross-chain transfer failed");
        }
      } else {
        // Use regular Sepolia transfer
        const connectedWallet = wallets.find(
          (wallet) => wallet.walletClientType === "privy"
        );
        if (!connectedWallet) {
          throw new Error("No wallet connected");
        }

        const provider = await connectedWallet.getEthereumProvider();
        if (!provider) {
          throw new Error("No wallet provider available");
        }

        // Check and switch to Sepolia if needed
        const currentChainId = await provider.request({
          method: "eth_chainId",
        });
        if (currentChainId !== "0xaa36a7") {
          await switchToSepolia();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const walletClient = createWalletClient({
          chain: sepolia,
          transport: custom(provider),
        });

        const userAddress = user.wallet.address as `0x${string}`;
        const recipientAddress = resolvedAddress as `0x${string}`;

        // Convert amount to USDC units (6 decimals)
        const amountInUnits = parseUnits(amount, 6);

        // Execute USDC transfer
        const hash = await walletClient.writeContract({
          address: USDC_CONTRACT_ADDRESS,
          abi: USDC_ABI,
          functionName: "transfer",
          args: [recipientAddress, amountInUnits],
          account: userAddress,
        });

        setTransactionHash(hash);

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        console.log("Transfer successful:", receipt);
        setTransactionStatus("success");

        // Refresh balances after successful transaction
        setTimeout(() => {
          fetchBalances();
        }, 2000);
      }
    } catch (error) {
      console.error("Send failed:", error);
      setTransactionStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    setTransactionStatus(null);
    setTransactionHash("");
    setErrorMessage("");
    setTransferResult(null);

    // Clear form only on successful transaction
    if (transactionStatus === "success") {
      setAmount("");
      setRecipient("");
      setResolvedAddress("");
      setSimulation(null);
    }
  };

  const isValidAmount =
    amount && parseFloat(amount) > 0 && parseFloat(amount) <= usdcAmount;
  const isValidRecipient = resolvedAddress && !addressError;

  const handleQrScan = async () => {
    try {
      // Request camera permission and access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setShowQrScanner(true);

      // In a real implementation, you would use a QR code scanner library like 'qr-scanner'
      // For now, this is a placeholder that simulates scanning
      setTimeout(() => {
        // Mock QR code data - in reality this would come from the scanner
        const mockQrData =
          "ethereum:0x742d35Cc6634C0532925a3b8D40C9F347d3C5D7e?value=25.5";
        parseQrCode(mockQrData);
        setShowQrScanner(false);
        stream.getTracks().forEach((track) => track.stop());
      }, 2000);
    } catch (error) {
      console.error("Camera access denied or not supported:", error);
      alert("Camera access is required to scan QR codes");
    }
  };

  const parseQrCode = (qrData: string) => {
    try {
      // Parse ethereum URI format: ethereum:address?value=amount
      if (qrData.startsWith("ethereum:")) {
        const url = new URL(qrData);
        const address = url.pathname;
        const value = url.searchParams.get("value");

        if (address) {
          setRecipient(address);
        }
        if (value) {
          setAmount(value);
        }
      } else if (
        qrData.startsWith("0x") ||
        qrData.endsWith(".eth") ||
        qrData.startsWith("@")
      ) {
        // Simple address format, ENS, or @username
        setRecipient(qrData);
      }
    } catch (error) {
      console.error("Invalid QR code format:", error);
    }
  };

  const selectedChain = SUPPORTED_CHAINS.find(
    (chain) => chain.id === targetChainId
  );

  return (
    <PageLayout title="Send">
      <LoginGate>
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 relative mb-32">
          <div className="text-text-primary opacity-70">Send USDC</div>

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

          {/* Cross-chain Toggle */}
          <div className="bg-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ArrowsRightLeftIcon className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Cross-chain Transfer
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCrossChain}
                  onChange={(e) => setIsCrossChain(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {isCrossChain
                ? "Send USDC to any supported chain using Nexus"
                : "Send USDC on Ethereum Sepolia"}
            </p>
          </div>

          {/* Target Chain Selection (only show if cross-chain is enabled) */}
          {isCrossChain && (
            <div className="bg-white p-4 rounded-lg space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Target Chain
              </label>
              <select
                value={targetChainId}
                onChange={(e) => setTargetChainId(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                {SUPPORTED_CHAINS.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name} ({chain.symbol})
                  </option>
                ))}
              </select>
            </div>
          )}

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
              placeholder="0xabc..., name.eth, or @username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />

            {/* Address resolution feedback */}
            {recipient && (
              <div className="text-sm">
                {isResolvingAddress && (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <div className="loading loading-spinner loading-sm"></div>
                    <span>Resolving address...</span>
                  </div>
                )}
                {!isResolvingAddress && addressError && (
                  <p className="text-red-600">{addressError}</p>
                )}
                {!isResolvingAddress && resolvedAddress && !addressError && (
                  <div className="text-green-600">
                    <span>
                      ✅ Resolved to: {resolvedAddress.slice(0, 6)}...
                      {resolvedAddress.slice(-4)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Format hints */}
            <div className="text-xs text-gray-500">
              <p>Supported formats:</p>
              <p>• Ethereum address: 0x742d35Cc...</p>
              <p>• ENS domain: alice.eth</p>
              <p>• Buddy subdomain: @alice (for alice.buddy.eth)</p>
            </div>
          </div>

          {/* Cross-chain Simulation Results */}
          {isCrossChain && (
            <>
              {isSimulating && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="loading loading-spinner loading-sm"></div>
                    <p className="text-blue-800 text-sm">
                      Calculating cross-chain transfer costs...
                    </p>
                  </div>
                </div>
              )}

              {simulation && !isSimulating && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">
                    📊 Cross-chain Transfer Preview
                  </h3>
                  <div className="space-y-1 text-sm text-green-700">
                    <p>Amount to send: {amount} USDC</p>
                    <p>
                      Recipient: {resolvedAddress.slice(0, 6)}...
                      {resolvedAddress.slice(-4)}
                    </p>
                    <p>Target chain: {selectedChain?.name}</p>
                    {(simulation as any).estimatedGas && (
                      <p>Estimated gas: {(simulation as any).estimatedGas}</p>
                    )}
                    {(simulation as any).transferFee && (
                      <p>Transfer fee: {(simulation as any).transferFee}</p>
                    )}
                    {(simulation as any).estimatedTime && (
                      <p>Estimated time: {(simulation as any).estimatedTime}</p>
                    )}
                  </div>
                </div>
              )}

              {!simulation &&
                !isSimulating &&
                amount &&
                parseFloat(amount) > 0 &&
                resolvedAddress &&
                !addressError && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-medium text-yellow-800 mb-2">
                      ⚠️ Cross-chain Transfer Not Available
                    </h3>
                    <div className="text-sm text-yellow-700">
                      <p>
                        Cross-chain transfer simulation is not available for
                        this combination. This could be due to:
                      </p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Insufficient balance on available source chains</li>
                        <li>Unsupported chain combination</li>
                        <li>Cross-chain account not fully initialized</li>
                      </ul>
                      <p className="mt-2">
                        <strong>Tip:</strong> Try using regular Sepolia transfer
                        instead, or wait for the cross-chain account to fully
                        initialize.
                      </p>
                    </div>
                  </div>
                )}
            </>
          )}

          {/* Send Button */}
          <div className="flex gap-3">
            <BlackButton
              onClick={handleSendClick}
              disabled={
                !isValidAmount ||
                !isValidRecipient ||
                isLoading ||
                !authenticated ||
                !isInitialized ||
                isResolvingAddress ||
                (isCrossChain && isSimulating) ||
                (isCrossChain &&
                  !simulation &&
                  amount.length > 0 &&
                  parseFloat(amount) > 0 &&
                  resolvedAddress.length > 0 &&
                  addressError.length === 0)
              }
              className="flex-1"
              icon={<PaperAirplaneIcon className="w-5 h-5" />}
            >
              {isCrossChain ? "Send Cross-chain" : "Send"}
            </BlackButton>
            <button
              onClick={handleQrScan}
              disabled={!authenticated || !isInitialized}
              className="bg-white w-12 h-12 rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <QrCodeIcon className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Confirmation Modal */}
          {showConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
                {transactionStatus === null && (
                  <>
                    <h3 className="text-lg font-semibold mb-4">
                      Confirm {isCrossChain ? "Cross-chain " : ""}Transaction
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Amount</span>
                          <span className="font-bold">{amount} USDC</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">To</span>
                          <span className="font-mono text-sm">{recipient}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Address</span>
                          <span className="font-mono text-sm">
                            {resolvedAddress.slice(0, 6)}...
                            {resolvedAddress.slice(-4)}
                          </span>
                        </div>
                        {isCrossChain && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Target Chain
                            </span>
                            <span className="text-sm">
                              {selectedChain?.name}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleCloseConfirmation}
                          className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmSend}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Confirm Send
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {transactionStatus === "pending" && (
                  <>
                    <div className="text-center py-8">
                      <div className="loading loading-spinner loading-lg mb-4"></div>
                      <h3 className="text-lg font-semibold mb-2">
                        Processing {isCrossChain ? "Cross-chain " : ""}
                        Transaction
                      </h3>
                      <p className="text-gray-600">
                        {isCrossChain
                          ? "Please wait while your cross-chain transfer is being processed..."
                          : "Please wait while your transaction is being processed..."}
                      </p>
                      {transactionHash && !isCrossChain && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            Transaction Hash:
                          </p>
                          <p className="font-mono text-xs break-all">
                            {transactionHash}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {transactionStatus === "success" && (
                  <>
                    <div className="text-center py-8">
                      <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2 text-green-800">
                        {isCrossChain ? "Cross-chain Transfer" : "Transaction"}{" "}
                        Successful!
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Successfully sent {amount} USDC to {recipient}
                        {isCrossChain && ` on ${selectedChain?.name}`}
                      </p>
                      {transactionHash && (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-600">
                            {isCrossChain
                              ? "Explorer Link:"
                              : "Transaction Hash:"}
                          </p>
                          <a
                            href={
                              isCrossChain
                                ? transactionHash
                                : `https://sepolia.etherscan.io/tx/${transactionHash}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs break-all text-blue-600 hover:underline"
                          >
                            {isCrossChain
                              ? "View transaction"
                              : transactionHash}
                          </a>
                        </div>
                      )}
                      <button
                        onClick={handleCloseConfirmation}
                        className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </>
                )}

                {transactionStatus === "error" && (
                  <>
                    <div className="text-center py-8">
                      <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2 text-red-800">
                        {isCrossChain ? "Cross-chain Transfer" : "Transaction"}{" "}
                        Failed
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {errorMessage ||
                          "An error occurred while processing your transaction"}
                      </p>
                      <button
                        onClick={handleCloseConfirmation}
                        className="bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* QR Scanner Modal */}
          {showQrScanner && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Scanning QR Code</h3>
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <div className="loading loading-spinner loading-lg"></div>
                  <p className="mt-4 text-gray-600">
                    Point your camera at the QR code
                  </p>
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

          {/* Cross-chain Info */}
          {isCrossChain && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                💡 <strong>Cross-chain Transfer:</strong> Nexus will
                automatically route your USDC from the best available source
                chain to the target chain and recipient address. The transfer
                may involve cross-chain bridging if needed.
              </p>
              {!isInitialized && (
                <p className="text-blue-700 text-sm mt-2">
                  <strong>Note:</strong> Cross-chain account is still
                  initializing. Please wait for initialization to complete
                  before attempting transfers.
                </p>
              )}
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
