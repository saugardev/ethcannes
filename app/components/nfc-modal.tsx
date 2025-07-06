"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import BlackButton from "./black-button";
import { XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useModal } from "@/providers/modal-provider";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createPublicClient,
  http,
  parseAbi,
  createWalletClient,
  custom,
  recoverMessageAddress,
} from "viem";
import { sepolia } from "viem/chains";

interface NfcModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  address: string;
}

interface HaloCommand {
  name: string;
  [key: string]: any;
}

interface HaloResult {
  etherAddresses?: { [key: string]: string };
  signature?: {
    ether: string;
  };
  [key: string]: any;
}

interface AddressInfo {
  key: string;
  address: string;
  balance?: string;
  isRegistered?: boolean;
  usdcAllowance?: string;
  registeredBy?: string;
  payerUsdcBalance?: string;
}

export default function NfcModal({
  isOpen,
  onClose,
  amount,
  address,
}: NfcModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<string>("Ready to receive payment");
  const [error, setError] = useState<string>("");
  const [addresses, setAddresses] = useState<AddressInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>("");

  const { setModalOpen } = useModal();
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  // Contract configuration
  const SEPOLIA_RPC_URL = "https://sepolia.drpc.org";
  const USDC_CONTRACT_ADDRESS =
    "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238" as const;
  const HALO_PAYMENT_CONTRACT_ADDRESS =
    "0xEC0250Af17481f9cB405081D49Fb9228769B3092" as const;

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC_URL),
  });

  // Contract ABIs
  const USDC_ABI = parseAbi([
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
  ]);

  const HALO_PAYMENT_ABI = parseAbi([
    "function getPayerFromHaloAddress(address haloAddress) view returns (address)",
    "function getAuthorizedHaloAddress(address user) view returns (address)",
    "function executePaymentFromHalo(address haloAddress, address merchant, uint256 amount, uint256 nonce, bytes calldata signature) external",
    "function getPaymentMessageHash(address payer, address merchant, uint256 amount, uint256 nonce) view returns (bytes32)",
    "function registerHaloAddress(address haloAddress) external",
  ]);

  useEffect(() => {
    if (isOpen && amount && address) {
      setIsListening(true);
      setStatus("Hold your device near the sender's HaLo tag");
      setError("");
      setPaymentStatus("");
      setIsPaymentComplete(false);
      setTransactionHash("");

      console.log("Setting up NFC for payment request:", { amount, address });

      // Start listening for NFC interaction
      startNFCListener();
    }

    return () => {
      setIsListening(false);
      setStatus("Ready to receive payment");
    };
  }, [isOpen, amount, address]);

  useEffect(() => {
    setModalOpen(isOpen);
  }, [isOpen, setModalOpen]);

  const startNFCListener = async () => {
    try {
      if (!("NDEFReader" in window) && !navigator.credentials) {
        throw new Error("NFC not supported on this device/browser");
      }

      // Auto-start the payment process when modal opens
      setTimeout(() => {
        if (isOpen && !isPaymentComplete) {
          executePaymentFlow();
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || "NFC setup failed");
      setStatus("NFC not available");
    }
  };

  const executePaymentFlow = async () => {
    if (!authenticated || !user?.wallet?.address) {
      setError("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    setError("");
    setPaymentStatus("Scanning for HaLo tag...");

    try {
      // Step 1: Scan HaLo tag to get addresses
      const addressInfos = await readHaloAddresses();

      if (!addressInfos.length) {
        throw new Error("No HaLo addresses found");
      }

      // Step 2: Find a registered address with sufficient balance
      const validAddress = await findValidPaymentAddress(addressInfos);

      if (!validAddress) {
        throw new Error(
          "No valid payment address found. Please ensure HaLo tag is registered and has sufficient USDC balance."
        );
      }

      // Step 3: Execute the payment
      await executePayment(validAddress);
    } catch (err: any) {
      setError(err.message || "Payment failed");
      setPaymentStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  const readHaloAddresses = async (): Promise<AddressInfo[]> => {
    setStatus("Scanning HaLo tag...");

    try {
      const { execHaloCmdWeb } = await import("@arx-research/libhalo/api/web");
      const result: HaloResult = await execHaloCmdWeb({ name: "get_pkeys" });

      if (!result.etherAddresses) {
        throw new Error("No addresses found on HaLo tag");
      }

      setStatus("Checking HaLo registrations...");

      // Check each address for registration and balance
      const entries = Object.entries(result.etherAddresses);
      const addressInfos = await Promise.all(
        entries.map(async ([key, address]) => {
          try {
            let isRegistered = false;
            let registeredBy = "";
            let usdcAllowance = "0";
            let payerUsdcBalance = "0";

            try {
              const registeredUser = await publicClient.readContract({
                address: HALO_PAYMENT_CONTRACT_ADDRESS,
                abi: HALO_PAYMENT_ABI,
                functionName: "getPayerFromHaloAddress",
                args: [address as `0x${string}`],
              });

              if (
                registeredUser &&
                registeredUser !== "0x0000000000000000000000000000000000000000"
              ) {
                isRegistered = true;
                registeredBy = registeredUser as string;

                // Check USDC allowance
                const allowance = await publicClient.readContract({
                  address: USDC_CONTRACT_ADDRESS,
                  abi: USDC_ABI,
                  functionName: "allowance",
                  args: [
                    registeredUser as `0x${string}`,
                    HALO_PAYMENT_CONTRACT_ADDRESS,
                  ],
                });
                usdcAllowance = (Number(allowance) / 1000000).toString();

                // Check USDC balance
                const payerBalance = await publicClient.readContract({
                  address: USDC_CONTRACT_ADDRESS,
                  abi: USDC_ABI,
                  functionName: "balanceOf",
                  args: [registeredUser as `0x${string}`],
                });
                payerUsdcBalance = (Number(payerBalance) / 1000000).toString();
              }
            } catch (contractError) {
              console.log(
                `Contract check failed for ${address}:`,
                contractError
              );
            }

            return {
              key,
              address,
              isRegistered,
              registeredBy,
              usdcAllowance,
              payerUsdcBalance,
            };
          } catch {
            return {
              key,
              address,
              isRegistered: false,
              registeredBy: "",
              usdcAllowance: "0",
              payerUsdcBalance: "0",
            };
          }
        })
      );

      setAddresses(addressInfos);
      return addressInfos;
    } catch (err: any) {
      throw new Error(`Failed to read HaLo addresses: ${err.message}`);
    }
  };

  const findValidPaymentAddress = async (
    addressInfos: AddressInfo[]
  ): Promise<AddressInfo | null> => {
    const paymentAmount = parseFloat(amount);

    for (const addressInfo of addressInfos) {
      if (
        addressInfo.isRegistered &&
        addressInfo.usdcAllowance &&
        addressInfo.payerUsdcBalance &&
        parseFloat(addressInfo.usdcAllowance) >= paymentAmount &&
        parseFloat(addressInfo.payerUsdcBalance) >= paymentAmount
      ) {
        return addressInfo;
      }
    }

    return null;
  };

  const executePayment = async (addressInfo: AddressInfo) => {
    if (!authenticated || !user?.wallet?.address) {
      throw new Error("Wallet not connected");
    }

    const connectedWallet = wallets.find(
      (wallet) => wallet.walletClientType === "privy"
    );
    if (!connectedWallet) {
      throw new Error("No wallet connected");
    }

    setPaymentStatus("Preparing payment...");

    try {
      // Get merchant address from connected wallet
      const merchantAddress = user.wallet.address;
      const haloAddress = addressInfo.address as `0x${string}`;
      const amountInWei = Math.round(parseFloat(amount) * 1000000); // USDC has 6 decimals
      const nonce = Date.now(); // Simple nonce using timestamp

      // Get the payer address from the contract
      const payerAddress = await publicClient.readContract({
        address: HALO_PAYMENT_CONTRACT_ADDRESS,
        abi: HALO_PAYMENT_ABI,
        functionName: "getPayerFromHaloAddress",
        args: [haloAddress],
      });

      if (
        !payerAddress ||
        payerAddress === "0x0000000000000000000000000000000000000000"
      ) {
        throw new Error("Could not find payer address for HaLo address");
      }

      // Get the message hash that needs to be signed
      const messageHash = await publicClient.readContract({
        address: HALO_PAYMENT_CONTRACT_ADDRESS,
        abi: HALO_PAYMENT_ABI,
        functionName: "getPaymentMessageHash",
        args: [
          payerAddress,
          merchantAddress as `0x${string}`,
          BigInt(amountInWei),
          BigInt(nonce),
        ],
      });

      setPaymentStatus("Getting signature from HaLo tag...");

      // Get signature from HaLo tag
      const { execHaloCmdWeb } = await import("@arx-research/libhalo/api/web");
      const result = await execHaloCmdWeb({
        name: "sign",
        message: messageHash,
        format: "hex",
        keyNo: addressInfo.key,
      });

      if (!result.signature || !result.signature.ether) {
        throw new Error("No signature received from HaLo tag");
      }

      setPaymentStatus("Executing payment on blockchain...");

      // Create wallet client for transaction
      const provider = await connectedWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(provider),
      });

      // Execute the payment
      const hash = await walletClient.writeContract({
        address: HALO_PAYMENT_CONTRACT_ADDRESS,
        abi: HALO_PAYMENT_ABI,
        functionName: "executePaymentFromHalo",
        args: [
          haloAddress,
          merchantAddress as `0x${string}`,
          BigInt(amountInWei),
          BigInt(nonce),
          result.signature.ether as `0x${string}`,
        ],
        account: merchantAddress as `0x${string}`,
      });

      setPaymentStatus("Waiting for confirmation...");

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      setPaymentStatus(`Payment successful! Received $${amount} USDC`);
      setIsPaymentComplete(true);
      setTransactionHash(hash);
      setStatus("Payment completed successfully!");
    } catch (err: any) {
      throw new Error(`Payment execution failed: ${err.message}`);
    }
  };

  const handleClose = () => {
    console.log("NFC Modal close button clicked");
    onClose();
  };

  const handleViewTransaction = () => {
    if (transactionHash) {
      window.open(
        `https://sepolia.etherscan.io/tx/${transactionHash}`,
        "_blank"
      );
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed top-0 left-0 right-0 bottom-0 bg-background"
      style={{
        height: "100vh",
        width: "100vw",
        zIndex: 99999,
        position: "fixed",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div className="w-full h-16 flex items-center justify-center px-4 lg:px-6 sticky top-0 z-50 bg-background">
        <h1 className="text-lg lg:text-xl font-bold text-base-content tracking-tight">
          {isPaymentComplete ? "Payment Complete" : "Tap to Receive"}
        </h1>
      </div>

      <div className="flex items-center justify-center p-4 pb-32 h-full">
        <div className="text-center space-y-6 max-w-md">
          <div className="relative w-64 h-64 mx-auto">
            {/* NFC/Success Image */}
            <div
              className={`w-full h-full rounded-2xl flex items-center justify-center shadow-lg ${
                isPaymentComplete
                  ? "bg-gradient-to-br from-green-500 to-emerald-600"
                  : "bg-gradient-to-br from-blue-500 to-purple-600"
              }`}
            >
              <div className="text-white text-center">
                {isPaymentComplete ? (
                  <>
                    <CheckCircleIcon className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-sm font-medium">Payment Received!</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                    <p className="text-sm font-medium">NFC Ready</p>
                    {(isListening || isLoading) && (
                      <div className="mt-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse mx-auto"></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-base-content/70 text-lg">
              {isPaymentComplete ? "Received" : "Request"} ${amount} USDC
            </p>
            <p className="text-xs text-base-content/50 break-all">
              {isPaymentComplete ? "From HaLo payment" : `To: ${address}`}
            </p>
          </div>

          {/* Status Display */}
          <div className="space-y-2">
            <p className="text-sm text-base-content/70">{status}</p>
            {paymentStatus && (
              <p className="text-sm text-blue-600 font-medium">
                {paymentStatus}
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center">
              <div className="loading loading-spinner loading-md"></div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-24 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-base-300">
        <div className="max-w-md mx-auto space-y-3">
          <p className="text-sm text-base-content/70 text-center">
            {isPaymentComplete
              ? `Successfully received $${amount} USDC via HaLo payment`
              : isLoading
              ? "Processing payment..."
              : `Hold sender's HaLo tag near device to receive $${amount} USDC`}
          </p>

          <div className="flex gap-2">
            {isPaymentComplete && transactionHash && (
              <BlackButton onClick={handleViewTransaction} className="flex-1">
                View Transaction
              </BlackButton>
            )}
            <BlackButton
              onClick={handleClose}
              icon={<XMarkIcon className="w-4 h-4" />}
              className={isPaymentComplete ? "flex-1" : "w-full"}
            >
              {isPaymentComplete ? "Close" : "Cancel"}
            </BlackButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
