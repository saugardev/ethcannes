# Complete ENS Subname Registration Guide

This guide covers everything needed to implement ENS subname registration in your app, allowing users to claim free usernames like `alice.yourapp.eth`.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Register Your ENS Domain](#step-1-register-your-ens-domain)
3. [Step 2: Wrap Your Domain](#step-2-wrap-your-domain)
4. [Step 3: Deploy Subname Registrar Contract](#step-3-deploy-subname-registrar-contract)
5. [Step 4: Configure Domain Permissions](#step-4-configure-domain-permissions)
6. [Step 5: Frontend Integration](#step-5-frontend-integration)
7. [Step 6: Testing](#step-6-testing)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js and npm/yarn installed
- Wallet with Sepolia ETH for transactions
- Basic understanding of smart contracts
- Your existing React app setup

## Step 1: Register Your ENS Domain

### 1.1 Go to ENS App

Visit [https://app.ens.domains/](https://app.ens.domains/) and connect your wallet.

### 1.2 Switch to Sepolia

- Click on the network selector (usually shows "Ethereum Mainnet")
- Select "Sepolia" testnet
- Confirm network switch in your wallet

### 1.3 Register Your Domain

1. Search for your desired domain (e.g., `yourapp.eth`)
2. If available, click "Request to register"
3. Complete the 2-step registration process:
   - **Step 1**: Submit request (wait 1 minute)
   - **Step 2**: Complete registration (pay registration fee)
4. Wait for confirmation

**Important**: Save your domain name exactly as registered (e.g., `yourapp.eth`)

## Step 2: Wrap Your Domain

### 2.1 Why Wrap?

Wrapping converts your ENS domain into an NFT and enables advanced features like subname management with fuses.

### 2.2 Wrap Process

1. Go to your domain's page on the ENS app
2. Click the "More" tab
3. Click "Wrap Name"
4. Confirm the transaction
5. Wait for confirmation

### 2.3 Verify Wrapping

After wrapping, your domain page should show:

- "Wrapped" status
- NFT token ID
- Fuses information

## Step 3: Deploy Subname Registrar Contract

### 3.1 Contract Code

Create this Solidity contract (you can use Remix IDE):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface INameWrapper {
    function setSubnodeOwner(
        bytes32 node,
        bytes32 label,
        address owner,
        uint32 fuses,
        uint64 expiry
    ) external returns (bytes32);

    function ownerOf(uint256 tokenId) external view returns (address);
}

contract YourAppSubnameRegistrar {
    INameWrapper public constant nameWrapper = INameWrapper(0x0635513f179D50A207757E05759CbD106d7dFcE8);
    bytes32 public immutable parentNode;
    address public owner;
    uint256 public registrationFee;

    mapping(address => string) public addressToUsername;
    mapping(string => address) public usernameToAddress;

    event UsernameRegistered(string indexed label, address indexed user);

    constructor(bytes32 _parentNode, address _owner) {
        parentNode = _parentNode;
        owner = _owner;
        registrationFee = 0; // Free registration
    }

    function register(string calldata label) external payable {
        require(msg.value >= registrationFee, "Insufficient payment");
        require(available(label), "Username not available");
        require(bytes(label).length >= 3, "Username too short");
        require(bytes(label).length <= 32, "Username too long");
        require(bytes(addressToUsername[msg.sender]).length == 0, "User already has username");
        require(isValidLabel(label), "Invalid characters in username");

        bytes32 labelHash = keccak256(bytes(label));

        // Create subname for the user
        nameWrapper.setSubnodeOwner(
            parentNode,
            labelHash,
            msg.sender,
            0, // No fuses
            0  // No expiry (inherits from parent)
        );

        // Store mappings
        addressToUsername[msg.sender] = label;
        usernameToAddress[label] = msg.sender;

        emit UsernameRegistered(label, msg.sender);
    }

    function available(string calldata label) public view returns (bool) {
        return usernameToAddress[label] == address(0);
    }

    function getUsernameByAddress(address user) external view returns (string memory) {
        return addressToUsername[user];
    }

    function isValidLabel(string calldata label) internal pure returns (bool) {
        bytes memory labelBytes = bytes(label);
        for (uint i = 0; i < labelBytes.length; i++) {
            bytes1 char = labelBytes[i];
            if (!(char >= 0x30 && char <= 0x39) && // 0-9
                !(char >= 0x61 && char <= 0x7A) && // a-z
                char != 0x2D) { // hyphen
                return false;
            }
        }
        return true;
    }

    // Owner functions
    function setRegistrationFee(uint256 _fee) external {
        require(msg.sender == owner, "Only owner");
        registrationFee = _fee;
    }

    function withdraw() external {
        require(msg.sender == owner, "Only owner");
        payable(owner).transfer(address(this).balance);
    }
}
```

### 3.2 Get Parent Node Hash

You need to calculate the namehash of your domain. Use this JavaScript:

```javascript
import { namehash } from "viem/ens";

const parentNode = namehash("yourapp.eth"); // Replace with your domain
console.log("Parent Node:", parentNode);
```

Or use an online ENS namehash calculator.

### 3.3 Deploy Contract

Using Remix IDE:

1. Go to [remix.ethereum.org](https://remix.ethereum.org)
2. Create new file with the contract code
3. Compile the contract
4. Switch to "Deploy & Run Transactions" tab
5. Select "Injected Provider - MetaMask"
6. Ensure you're on Sepolia network
7. Deploy with constructor parameters:
   - `_parentNode`: Your calculated namehash
   - `_owner`: Your wallet address

**Save the deployed contract address!**

## Step 4: Configure Domain Permissions

### 4.1 Set Registrar as Controller

Your registrar contract needs permission to create subnames. In the ENS app:

1. Go to your wrapped domain
2. Click "Permissions" tab
3. Add your registrar contract address as a controller
4. Confirm transaction

### 4.2 Verify Permissions

Check that your registrar contract is listed as an authorized controller.

## Step 5: Frontend Integration

### 5.1 Add Contract Configuration

In your `app/page.tsx`, add the registrar configuration:

```typescript
// Add to your existing contract addresses
const SUBNAME_REGISTRAR_ADDRESS = "0x..."; // Your deployed contract address

// Add to your existing ABIs
const SUBNAME_REGISTRAR_ABI = parseAbi([
  "function register(string calldata label) external payable",
  "function available(string calldata label) view returns (bool)",
  "function getUsernameByAddress(address user) view returns (string memory)",
  "function addressToUsername(address) view returns (string)",
  "function usernameToAddress(string) view returns (address)",
  "function registrationFee() view returns (uint256)",
]);
```

### 5.2 Add Username Registration Component

Add this to your existing `HomePage` component:

```typescript
// Add these state variables to your existing useState declarations
const [username, setUsername] = useState("");
const [isCheckingUsername, setIsCheckingUsername] = useState(false);
const [isRegisteringUsername, setIsRegisteringUsername] = useState(false);
const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
  null
);
const [userCurrentUsername, setUserCurrentUsername] = useState<string>("");

// Add these functions to your existing component
const checkUsernameAvailability = useCallback(async () => {
  if (!username || username.length < 3) {
    setUsernameAvailable(null);
    return;
  }

  setIsCheckingUsername(true);
  try {
    const available = await publicClient.readContract({
      address: SUBNAME_REGISTRAR_ADDRESS,
      abi: SUBNAME_REGISTRAR_ABI,
      functionName: "available",
      args: [username],
    });
    setUsernameAvailable(available);
  } catch (error) {
    console.error("Error checking username availability:", error);
    setUsernameAvailable(null);
  } finally {
    setIsCheckingUsername(false);
  }
}, [username, publicClient]);

const registerUsername = async () => {
  if (
    !authenticated ||
    !user?.wallet?.address ||
    !username ||
    !usernameAvailable
  ) {
    return;
  }

  setIsRegisteringUsername(true);
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

    // Register username
    const hash = await walletClient.writeContract({
      address: SUBNAME_REGISTRAR_ADDRESS,
      abi: SUBNAME_REGISTRAR_ABI,
      functionName: "register",
      args: [username],
      account: userAddress,
      value: registrationFee,
    });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash });

    console.log(`Username ${username}.yourapp.eth registered successfully!`);

    // Refresh user's current username
    fetchUserUsername();

    // Clear form
    setUsername("");
    setUsernameAvailable(null);
  } catch (error) {
    console.error("Error registering username:", error);
    alert(
      `Registration failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    setIsRegisteringUsername(false);
  }
};

const fetchUserUsername = useCallback(async () => {
  if (!authenticated || !user?.wallet?.address) return;

  try {
    const userAddress = user.wallet.address as `0x${string}`;
    const currentUsername = await publicClient.readContract({
      address: SUBNAME_REGISTRAR_ADDRESS,
      abi: SUBNAME_REGISTRAR_ABI,
      functionName: "getUsernameByAddress",
      args: [userAddress],
    });
    setUserCurrentUsername(currentUsername || "");
  } catch (error) {
    console.error("Error fetching username:", error);
    setUserCurrentUsername("");
  }
}, [authenticated, user, publicClient]);

// Add useEffect for username availability checking
useEffect(() => {
  const timer = setTimeout(checkUsernameAvailability, 500);
  return () => clearTimeout(timer);
}, [username, checkUsernameAvailability]);

// Add useEffect for fetching user's current username
useEffect(() => {
  if (authenticated && user?.wallet?.address) {
    fetchUserUsername();
  }
}, [authenticated, user?.wallet?.address, fetchUserUsername]);
```

### 5.3 Add Username UI

Add this JSX to your existing component (after the Linked Cards section):

```typescript
{
  /* Username Registration Section */
}
<div className="mt-6">
  <h3 className="text-text-primary opacity-70 mb-3">ENS Username</h3>

  {userCurrentUsername ? (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">ENS</span>
        </div>
        <div>
          <div className="font-medium text-green-800">
            {userCurrentUsername}.yourapp.eth
          </div>
          <div className="text-sm text-green-600">
            Your ENS username is active
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="bg-white rounded-lg p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Claim your free username
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
              )
            }
            placeholder="Enter username"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isRegisteringUsername}
            maxLength={32}
          />
          <span className="text-gray-500 text-sm">.yourapp.eth</span>
        </div>

        {/* Username validation and availability */}
        {username && username.length > 0 && (
          <div className="mt-2 text-sm">
            {username.length < 3 && (
              <span className="text-red-600">
                Username must be at least 3 characters
              </span>
            )}
            {username.length >= 3 && isCheckingUsername && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="loading loading-spinner loading-sm"></div>
                <span>Checking availability...</span>
              </div>
            )}
            {username.length >= 3 &&
              !isCheckingUsername &&
              usernameAvailable === true && (
                <span className="text-green-600">
                  ✅ {username}.yourapp.eth is available!
                </span>
              )}
            {username.length >= 3 &&
              !isCheckingUsername &&
              usernameAvailable === false && (
                <span className="text-red-600">
                  ❌ {username}.yourapp.eth is already taken
                </span>
              )}
          </div>
        )}
      </div>

      <button
        onClick={registerUsername}
        disabled={
          !usernameAvailable ||
          isRegisteringUsername ||
          !authenticated ||
          username.length < 3
        }
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {isRegisteringUsername ? (
          <>
            <div className="loading loading-spinner loading-sm"></div>
            <span>Registering...</span>
          </>
        ) : (
          <span>Register Username (Free)</span>
        )}
      </button>
    </div>
  )}
</div>;
```

## Step 6: Testing

### 6.1 Test Registration

1. Connect your wallet to your app
2. Enter a username (3+ characters, letters/numbers/hyphens only)
3. Wait for availability check
4. Click "Register Username"
5. Confirm transaction in wallet
6. Wait for confirmation

### 6.2 Verify Registration

1. Check the ENS app - your subname should appear
2. Try resolving `username.yourapp.eth` in ENS-compatible apps
3. Verify the username appears in your app after registration

### 6.3 Test Edge Cases

- Try registering the same username twice
- Test usernames with invalid characters
- Test usernames that are too short/long
- Test with insufficient gas

## Troubleshooting

### Common Issues

**"Transaction failed"**

- Check if your registrar contract is set as a controller
- Verify you're on Sepolia network
- Ensure sufficient gas

**"Username not available" but it should be**

- Check if the username was registered in a previous test
- Verify contract deployment and configuration

**"No wallet connected"**

- Ensure Privy wallet is connected
- Check network is set to Sepolia

**Subname doesn't resolve**

- Wait a few minutes for ENS propagation
- Check if the transaction was confirmed
- Verify the registrar has controller permissions

### Debug Steps

1. **Check contract on Etherscan Sepolia**

   - Verify contract is deployed
   - Check recent transactions
   - Read contract state

2. **Verify ENS configuration**

   - Check domain is wrapped
   - Verify registrar is a controller
   - Check domain hasn't expired

3. **Test contract functions directly**
   - Use Etherscan's "Read Contract" tab
   - Test `available()` function
   - Check `getUsernameByAddress()` function

### Contract Addresses (Sepolia)

- ENS Registry: `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`
- Name Wrapper: `0x0635513f179D50A207757E05759CbD106d7dFcE8`
- Your Registrar: `[Your deployed contract address]`

## Security Considerations

1. **Input Validation**: Contract validates username format
2. **Reentrancy**: Simple functions minimize attack surface
3. **Access Control**: Only owner can modify fees
4. **Gas Limits**: Functions are gas-efficient
5. **One Username Per Address**: Prevents spam

## Next Steps

After successful implementation:

1. Consider adding username transfer functionality
2. Implement username expiration if needed
3. Add more sophisticated validation rules
4. Consider integrating with your payment system
5. Add username search and directory features

## Support

If you encounter issues:

1. Check the ENS documentation
2. Review transaction logs on Etherscan
3. Test with small amounts first
4. Verify all addresses and configurations

Remember: This is on Sepolia testnet, so mistakes are low-cost to fix!
