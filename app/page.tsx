"use client";

import PageLayout from "./components/page-layout";

import LoginGate from "./components/login-gate";
import { useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useNexus } from "@avail-project/nexus";
import type { UserAsset } from "@avail-project/nexus";
import { CreditCardIcon, ScaleIcon } from "@heroicons/react/24/outline";
import {
  createPublicClient,
  http,
  parseAbi,
  createWalletClient,
  custom,
} from "viem";
import { sepolia } from "viem/chains";

interface HaloResult {
  etherAddresses?: { [key: string]: string };
  [key: string]: unknown;
}

interface AddressInfo {
  key: string;
  address: string;
  isRegistered?: boolean;
}

function HomePage() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { sdk } = useNexus();
  const [balances, setBalances] = useState<UserAsset[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);
  const [linkedCards, setLinkedCards] = useState<string[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);

  // Contract addresses and configuration
  const SEPOLIA_RPC_URL = "https://sepolia.drpc.org";
  const USDC_CONTRACT_ADDRESS =
    "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238" as const;
  const HALO_PAYMENT_CONTRACT_ADDRESS =
    "0xEC0250Af17481f9cB405081D49Fb9228769B3092" as const;

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC_URL),
  });

  const USDC_ABI = parseAbi([
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
  ]);

  const HALO_PAYMENT_ABI = parseAbi([
    "function getAuthorizedHaloAddress(address user) view returns (address)",
    "function getPayerFromHaloAddress(address haloAddress) view returns (address)",
    "function registerHaloAddress(address haloAddress) external",
  ]);

  const handleAddCard = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) {
      return;
    }

    setIsCheckingApproval(true);

    try {
      // Check current USDC allowance
      const userAddress = user.wallet.address as `0x${string}`;
      const currentAllowance = await publicClient.readContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: USDC_ABI,
        functionName: "allowance",
        args: [userAddress, HALO_PAYMENT_CONTRACT_ADDRESS],
      });

      const allowanceAmount = Number(currentAllowance) / 1000000; // USDC has 6 decimals

      // Check if user has sufficient allowance (500 USDC threshold)
      const requiredAllowance = 500;

      if (allowanceAmount >= requiredAllowance) {
        // User has sufficient approval, proceed to scan for HaLo chips
        console.log("User has sufficient USDC approval, proceeding to scan...");
        await scanForHaloChips();
      } else {
        // Ask user to give max approval
        await approveUSDC(userAddress);
      }
    } catch (error) {
      console.error("Error checking USDC approval:", error);
    } finally {
      setIsCheckingApproval(false);
    }
  }, [authenticated, user, publicClient, USDC_CONTRACT_ADDRESS, USDC_ABI, HALO_PAYMENT_CONTRACT_ADDRESS]); // eslint-disable-line react-hooks/exhaustive-deps

  const approveUSDC = async (userAddress: `0x${string}`) => {
    try {
      // Get the connected wallet
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

      // Check current chain and switch to Sepolia if needed
      const currentChainId = await provider.request({ method: "eth_chainId" });

      if (currentChainId !== "0xaa36a7") {
        // Sepolia chain ID in hex
        await switchToSepolia();
        // Wait a moment for the network switch to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(provider),
      });

      // Max approval amount (2^256 - 1)
      const maxApprovalAmount = BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      );

      const hash = await walletClient.writeContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: USDC_ABI,
        functionName: "approve",
        args: [HALO_PAYMENT_CONTRACT_ADDRESS, maxApprovalAmount],
        account: userAddress,
      });

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      console.log("USDC max approval confirmed");

      // After approval, proceed to scan for HaLo chips
      await scanForHaloChips();
    } catch (error: unknown) {
      console.error("Error approving USDC:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Provide more specific error messages
      if (errorMessage.includes("does not match the target chain")) {
        console.error(
          "Please switch your wallet to Sepolia network and try again."
        );
      } else if (errorMessage.includes("User rejected")) {
        console.error(
          "Network switch was rejected. Please manually switch to Sepolia."
        );
      }
    }
  };

  const scanForHaloChips = async () => {
    try {
      if (!("NDEFReader" in window) && !navigator.credentials) {
        throw new Error("NFC not supported on this device/browser");
      }

      const { execHaloCmdWeb } = await import("@arx-research/libhalo/api/web");
      const result: HaloResult = await execHaloCmdWeb({ name: "get_pkeys" });

      if (!result.etherAddresses) {
        throw new Error("No addresses found on HaLo tag");
      }

      // Find slot 1 address (key "1")
      const slot1Address = result.etherAddresses["1"];
      if (!slot1Address) {
        throw new Error("No address found in slot 1 of HaLo tag");
      }

      // Check if slot 1 address is already registered
      const registeredUser = await publicClient.readContract({
        address: HALO_PAYMENT_CONTRACT_ADDRESS,
        abi: HALO_PAYMENT_ABI,
        functionName: "getPayerFromHaloAddress",
        args: [slot1Address as `0x${string}`],
      });

      const isRegistered =
        registeredUser &&
        registeredUser !== "0x0000000000000000000000000000000000000000";

      if (!isRegistered) {
        // Automatically register slot 1 address
        const addressInfo: AddressInfo = {
          key: "1",
          address: slot1Address,
          isRegistered: false,
        };

        await registerHaloAddress(addressInfo);
      } else {
        console.log("Slot 1 address is already registered");
        // Refresh linked cards to show the existing card
        setTimeout(() => {
          fetchLinkedCards();
        }, 1000);
      }
    } catch (error: unknown) {
      console.error("Error scanning HaLo chips:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Error scanning HaLo chip: ${errorMessage}`);
    }
  };

  const switchToSepolia = async () => {
    try {
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

      // Try to switch to Sepolia
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }], // Sepolia chain ID in hex
        });
      } catch (switchError: unknown) {
        // If the chain hasn't been added to the wallet, add it
        if (switchError instanceof Error && 'code' in switchError && switchError.code === 4902) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia",
                nativeCurrency: {
                  name: "Sepolia Ether",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: [SEPOLIA_RPC_URL],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
    } catch (error: unknown) {
      console.error("Error switching to Sepolia:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to switch to Sepolia: ${errorMessage}`);
    }
  };

  const registerHaloAddress = async (addressInfo: AddressInfo) => {
    if (!authenticated || !user?.wallet?.address) {
      return;
    }

    try {
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

      // Check current chain and switch to Sepolia if needed
      const currentChainId = await provider.request({ method: "eth_chainId" });

      if (currentChainId !== "0xaa36a7") {
        // Sepolia chain ID in hex
        await switchToSepolia();
        // Wait a moment for the network switch to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(provider),
      });

      const userAddress = user.wallet.address as `0x${string}`;
      const haloAddress = addressInfo.address as `0x${string}`;

      const hash = await walletClient.writeContract({
        address: HALO_PAYMENT_CONTRACT_ADDRESS,
        abi: HALO_PAYMENT_ABI,
        functionName: "registerHaloAddress",
        args: [haloAddress],
        account: userAddress,
      });

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      console.log("HaLo address registered successfully!");

      // Refresh linked cards to show the newly registered card
      setTimeout(() => {
        fetchLinkedCards();
      }, 2000);
    } catch (error: unknown) {
      console.error("Error registering HaLo address:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Provide more specific error messages
      if (errorMessage.includes("does not match the target chain")) {
        console.error(
          "Please switch your wallet to Sepolia network and try again."
        );
        alert("Please switch your wallet to Sepolia network and try again.");
      } else if (errorMessage.includes("User rejected")) {
        console.error(
          "Network switch was rejected. Please manually switch to Sepolia."
        );
        alert(
          "Network switch was rejected. Please manually switch to Sepolia."
        );
      } else {
        console.error(
          `Registration failed: ${errorMessage}`
        );
        alert(`Registration failed: ${errorMessage}`);
      }
    }
  };

  const fetchLinkedCards = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) return;

    setIsLoadingCards(true);
    try {
      const userAddress = user.wallet.address as `0x${string}`;

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));

      const authorizedHaloAddress = await publicClient.readContract({
        address: HALO_PAYMENT_CONTRACT_ADDRESS,
        abi: HALO_PAYMENT_ABI,
        functionName: "getAuthorizedHaloAddress",
        args: [userAddress],
      });

      if (
        authorizedHaloAddress &&
        authorizedHaloAddress !== "0x0000000000000000000000000000000000000000"
      ) {
        setLinkedCards([authorizedHaloAddress as string]);
      } else {
        setLinkedCards([]);
      }
    } catch (error) {
      console.error("Error fetching linked cards:", error);
      // Don't clear cards on error to avoid flickering
      if (linkedCards.length === 0) {
        setLinkedCards([]);
      }
    } finally {
      setIsLoadingCards(false);
    }
  }, [authenticated, user, publicClient, linkedCards.length, HALO_PAYMENT_CONTRACT_ADDRESS, HALO_PAYMENT_ABI]);

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
        return initialized;
      }
      return false;
    };

    checkInit();
    const interval = setInterval(async () => {
      const initialized = await checkInit();
      if (initialized) {
        clearInterval(interval); // Stop polling once initialized
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sdk, checkInitialization]);

  useEffect(() => {
    if (isInitialized) {
      fetchBalances();
    }
  }, [authenticated, sdk, isInitialized, fetchBalances]);

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      // Debounce the call to avoid multiple rapid calls
      const timer = setTimeout(() => {
        fetchLinkedCards();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [authenticated, user?.wallet?.address, fetchLinkedCards]);

  // Get USDC balance
  const usdcBalance = balances.find((asset) => asset.symbol === "USDC");
  const usdcAmount = usdcBalance ? parseFloat(usdcBalance.balance) : 0;

  return (
    <PageLayout title="Buddy">
      <LoginGate>
        <div className="p-4 sm:p-6 lg:p-8 space-y-4">
          <div className="text-text-primary opacity-70">Your Balance</div>

          {/* USDC Balance Card */}
          <div>
            <div
              className={`bg-white p-4 cursor-pointer transition-all duration-200 ${
                isExpanded ? "rounded-t-lg" : "rounded-lg"
              }`}
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
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
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
                  <div className="mt-2">
                    {usdcBalance.breakdown.map((chainBreakdown, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center py-2 border-b border-base-300 last:border-b-0"
                      >
                        <span className="text-xs text-base-content/70">
                          {chainBreakdown.chain.name || "Unknown Network"}
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
                <span className="text-lg">
                  <ScaleIcon className="w-5 h-5" />
                </span>
                <span>Rebalance</span>
              </button>
              <button
                className="bg-white text-gray-900 rounded-full px-6 py-3 flex items-center justify-center gap-2 font-medium transition-all duration-200 hover:bg-gray-50 active:scale-95 flex-1 disabled:opacity-50"
                onClick={handleAddCard}
                disabled={isCheckingApproval}
              >
                <span className="text-lg">
                  {isCheckingApproval ? (
                    <div className="loading loading-spinner loading-sm"></div>
                  ) : (
                    <CreditCardIcon className="w-5 h-5" />
                  )}
                </span>
                <span>{isCheckingApproval ? "Checking..." : "Add Card"}</span>
              </button>
            </div>

            {/* Linked Cards Section */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-text-primary opacity-70">Linked Cards</h3>
                <div className="flex items-center gap-2">
                  {isLoadingCards && (
                    <div className="loading loading-spinner loading-sm"></div>
                  )}
                  <button
                    onClick={() => fetchLinkedCards()}
                    disabled={isLoadingCards}
                    className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {linkedCards.length > 0 ? (
                <div className="space-y-2">
                  {linkedCards.map((address, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-3 flex items-center justify-between border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <CreditCardIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            HaLo Card
                          </div>
                          <div className="text-sm text-gray-500 font-mono">
                            {shortenAddress(address)}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-green-600 font-medium">
                        Active
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <CreditCardIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No cards linked yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Click &quot;Add Card&quot; to link your first HaLo card
                  </p>
                </div>
              )}
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
