// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface INameWrapper {
    function setSubnodeOwner(
        bytes32 node,
        string calldata label,
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

        // Create subname for the user
        nameWrapper.setSubnodeOwner(
            parentNode,
            label,
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