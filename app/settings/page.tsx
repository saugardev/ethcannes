"use client";

import PageLayout from "../components/page-layout";
import { useViewTransitionRouter } from "../components/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState, useEffect, useCallback } from "react";
import {
  createPublicClient,
  http,
  parseAbi,
  createWalletClient,
  custom,
} from "viem";
import { sepolia } from "viem/chains";

export default function SettingsPage() {
  const { goBack } = useViewTransitionRouter();
  const { user, logout, authenticated } = usePrivy();
  const { wallets } = useWallets();

  // ENS Subdomain Registration State
  const [subdomain, setSubdomain] = useState("");
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [isRegisteringSubdomain, setIsRegisteringSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(
    null
  );
  const [userCurrentSubdomain, setUserCurrentSubdomain] = useState<string>("");

  // Contract Configuration
  const SEPOLIA_RPC_URL = "https://sepolia.drpc.org";
  const SUBNAME_REGISTRAR_ADDRESS =
    "0x9a02a25036A70D53663CDf30335169e734E319B1" as const;

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC_URL),
  });

  const SUBNAME_REGISTRAR_ABI = parseAbi([
    "function register(string calldata label) external payable",
    "function available(string calldata label) view returns (bool)",
    "function getUsernameByAddress(address user) view returns (string memory)",
    "function addressToUsername(address) view returns (string)",
    "function usernameToAddress(string) view returns (address)",
    "function registrationFee() view returns (uint256)",
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

  // Check subdomain availability
  const checkSubdomainAvailability = useCallback(async () => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null);
      return;
    }

    setIsCheckingSubdomain(true);
    try {
      const available = await publicClient.readContract({
        address: SUBNAME_REGISTRAR_ADDRESS,
        abi: SUBNAME_REGISTRAR_ABI,
        functionName: "available",
        args: [subdomain],
      });
      setSubdomainAvailable(available);
    } catch (error) {
      console.error("Error checking subdomain availability:", error);
      setSubdomainAvailable(null);
    } finally {
      setIsCheckingSubdomain(false);
    }
  }, [subdomain, publicClient]);

  // Register subdomain
  const registerSubdomain = async () => {
    if (
      !authenticated ||
      !user?.wallet?.address ||
      !subdomain ||
      !subdomainAvailable
    ) {
      return;
    }

    setIsRegisteringSubdomain(true);
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

      // Check and switch to Sepolia if needed
      const currentChainId = await provider.request({ method: "eth_chainId" });
      if (currentChainId !== "0xaa36a7") {
        await switchToSepolia();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(provider),
      });

      const userAddress = user.wallet.address as `0x${string}`;

      // Get registration fee
      const registrationFee = await publicClient.readContract({
        address: SUBNAME_REGISTRAR_ADDRESS,
        abi: SUBNAME_REGISTRAR_ABI,
        functionName: "registrationFee",
      });

      // Register subdomain
      const hash = await walletClient.writeContract({
        address: SUBNAME_REGISTRAR_ADDRESS,
        abi: SUBNAME_REGISTRAR_ABI,
        functionName: "register",
        args: [subdomain],
        account: userAddress,
        value: registrationFee,
      });

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      console.log(`Subdomain ${subdomain}.buddy.eth registered successfully!`);

      // Refresh user's current subdomain
      fetchUserSubdomain();

      // Clear form
      setSubdomain("");
      setSubdomainAvailable(null);
    } catch (error) {
      console.error("Error registering subdomain:", error);
      alert(
        `Registration failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsRegisteringSubdomain(false);
    }
  };

  // Fetch user's current subdomain
  const fetchUserSubdomain = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) return;

    try {
      const userAddress = user.wallet.address as `0x${string}`;
      const currentSubdomain = await publicClient.readContract({
        address: SUBNAME_REGISTRAR_ADDRESS,
        abi: SUBNAME_REGISTRAR_ABI,
        functionName: "getUsernameByAddress",
        args: [userAddress],
      });
      setUserCurrentSubdomain(currentSubdomain || "");
    } catch (error) {
      console.error("Error fetching subdomain:", error);
      setUserCurrentSubdomain("");
    }
  }, [authenticated, user, publicClient]);

  // Check subdomain availability on input change
  useEffect(() => {
    const timer = setTimeout(checkSubdomainAvailability, 500);
    return () => clearTimeout(timer);
  }, [subdomain, checkSubdomainAvailability]);

  // Fetch user's current subdomain on component mount
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      fetchUserSubdomain();
    }
  }, [authenticated, user?.wallet?.address, fetchUserSubdomain]);

  return (
    <PageLayout title="Settings" showBackButton={true} onBackClick={goBack}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 lg:space-y-6">
        <div className="prose prose-sm lg:prose-base max-w-none">
          <div className="space-y-6">
            {/* ENS Subdomain Registration */}
            <div className="card bg-base-200/50 shadow-lg">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-4">
                  <div className="badge badge-info badge-lg">🌐</div>
                  <div>
                    <h3 className="card-title text-lg">Payment Identity</h3>
                    <p className="text-base-content/70">
                      Register your unique subdomain for payments
                    </p>
                  </div>
                </div>

                {userCurrentSubdomain ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          ENS
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-green-800">
                          {userCurrentSubdomain}.buddy.eth
                        </div>
                        <div className="text-sm text-green-600">
                          Your payment identity is active
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Claim your payment subdomain (one-time only)
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={subdomain}
                          onChange={(e) =>
                            setSubdomain(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9-]/g, "")
                            )
                          }
                          placeholder="Enter subdomain"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isRegisteringSubdomain}
                          maxLength={32}
                        />
                        <span className="text-gray-500 text-sm">
                          .buddy.eth
                        </span>
                      </div>

                      {/* Subdomain validation and availability */}
                      {subdomain && subdomain.length > 0 && (
                        <div className="mt-2 text-sm">
                          {subdomain.length < 3 && (
                            <span className="text-red-600">
                              Subdomain must be at least 3 characters
                            </span>
                          )}
                          {subdomain.length >= 3 && isCheckingSubdomain && (
                            <div className="flex items-center space-x-2 text-gray-500">
                              <div className="loading loading-spinner loading-sm"></div>
                              <span>Checking availability...</span>
                            </div>
                          )}
                          {subdomain.length >= 3 &&
                            !isCheckingSubdomain &&
                            subdomainAvailable === true && (
                              <span className="text-green-600">
                                ✅ {subdomain}.buddy.eth is available!
                              </span>
                            )}
                          {subdomain.length >= 3 &&
                            !isCheckingSubdomain &&
                            subdomainAvailable === false && (
                              <span className="text-red-600">
                                ❌ {subdomain}.buddy.eth is already taken
                              </span>
                            )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={registerSubdomain}
                      disabled={
                        !subdomainAvailable ||
                        isRegisteringSubdomain ||
                        !authenticated ||
                        subdomain.length < 3
                      }
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isRegisteringSubdomain ? (
                        <>
                          <div className="loading loading-spinner loading-sm"></div>
                          <span>Registering...</span>
                        </>
                      ) : (
                        <span>Register Subdomain (Free)</span>
                      )}
                    </button>

                    <div className="text-xs text-gray-500 mt-2">
                      Note: You can only register one subdomain per wallet
                      address. This will be used to identify you for payments.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Account Settings */}
            <div className="card bg-base-200/50 shadow-lg">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="badge badge-primary badge-lg">⚙️</div>
                  <div>
                    <h3 className="card-title text-lg">Account Settings</h3>
                    <p className="text-base-content/70">
                      Manage your account preferences
                    </p>
                  </div>
                </div>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-primary btn-sm">Configure</button>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="card bg-base-200/50 shadow-lg">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="badge badge-secondary badge-lg">🔒</div>
                  <div>
                    <h3 className="card-title text-lg">Privacy</h3>
                    <p className="text-base-content/70">
                      Control your privacy settings
                    </p>
                  </div>
                </div>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-secondary btn-sm">Manage</button>
                </div>
              </div>
            </div>

            {/* Wallet Connection */}
            <div className="card bg-base-200/50 shadow-lg">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="badge badge-accent badge-lg">💳</div>
                  <div>
                    <h3 className="card-title text-lg">Wallet Connection</h3>
                    <p className="text-base-content/70">
                      Connected:{" "}
                      {user?.email?.address ||
                        user?.wallet?.address?.slice(0, 6) +
                          "..." +
                          user?.wallet?.address?.slice(-4)}
                    </p>
                  </div>
                </div>
                <div className="card-actions justify-end mt-4">
                  <button onClick={logout} className="btn btn-error btn-sm">
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
