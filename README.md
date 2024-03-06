# Deterministic AA Factory

The `DeterministicAccountFactory` smart contract helps service providers to reserve ERC4337 accounts such as LightAccount for their user in a deterministic and non-custodial manner.

## Contract Addresses

The contract is deployed across multiple networks:

| Network          | Address                                      |
| ---------------- | -------------------------------------------- |
| **Mainnet**      |                                              |
| Optimism         | `0x4c285e9F2fE53bd41FF24Ff89b41e24ceB754dE4` |
| Arbitrum One     | `0x4c285e9F2fE53bd41FF24Ff89b41e24ceB754dE4` |
| Polygon PoS      | `0x4c285e9F2fE53bd41FF24Ff89b41e24ceB754dE4` |
| **Testnet**      |                                              |
| Sepolia          | `0x4c285e9F2fE53bd41FF24Ff89b41e24ceB754dE4` |
| Optimism Sepolia | `0x4c285e9F2fE53bd41FF24Ff89b41e24ceB754dE4` |
| Arbitrum Sepolia | `0x4c285e9F2fE53bd41FF24Ff89b41e24ceB754dE4` |
| Polygon Mumbai   | `0x4c285e9F2fE53bd41FF24Ff89b41e24ceB754dE4` |

## How It Works

### Creating an Account

**Direct Method**:

```solidity
// Call this method to create a new account directly
function createAccount(address factory, uint256 salt, bytes calldata transferOwnershipCode) external payable returns (address);
```

**With Signature Verification**:

```solidity
// Use this method for added security by including a signature
function createAccountWithSignature(address factory, uint256 salt, bytes calldata transferOwnershipCode, bytes calldata signature) external payable returns (address);
```

### Computing the Deterministic Address

Before creating an account, you can compute its address:

```solidity
// This function allows you to compute the address of an account before creating it
function getDeterministicAddress(address factory, address securedBy, uint256 salt) public view returns (address);
```

## Utility for Deterministic Account Management

The `DeterministicAccountFactory` contract is complemented by a TypeScript utility that helps computing deterministic addresses and creating signatures.

### Features

- **Compute Deterministic Addresses**: Calculate the address of a new account before its creation, based on the factory, salt, and the address securing the account.
- **Generate Transfer Ownership Codes**: Obtain ABI-encoded data required for transferring ownership of an account.
- **Create Signatures**: Allow users to deploy their secured smart contracts using server-side signatures.

### Setup

Note that this utility has viem as its peerDependency.

```bash
npm install @deterministic-aa/utils
```

```typescript
import {
  getDeterministicAddress,
  getTransferOwnershipCode,
  getCreateAccountSignature,
  SupportedFactory,
} from "@deterministic-aa/utils";
```

### Examples

#### Computing a Deterministic Address

```typescript
const deterministicAddress = getDeterministicAddress({
  factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY, // ERC4337 Factory to use
  salt: "0x01", // Recommended to use the hash of unique user id.
  securedBy: "0xSecuredByAddress", // Server side account that has a permission
});
console.log(`Deterministic Address: ${deterministicAddress}`);
```

#### Generating a Transfer Ownership Code

```typescript
const transferOwnershipCode = getTransferOwnershipCode({
  factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY, // ERC4337 Factory to use
  owner: "0xOwnerAddress", // The new owner's address
});
console.log(`Transfer Ownership Code: ${transferOwnershipCode}`);
```

#### Creating a Signature for Account Creation

Before creating a secured account, you must generate a signature:

```typescript
const signature = await getCreateAccountSignature({
  publicClient: publicClientInstance, // Instance of PublicClient from 'viem'
  walletClient: walletClientInstance, // Instance of WalletClient from 'viem'
  securedBy: "0xSecuredByAddress", // Server side account that has a permission
  factory: SupportedFactory.LIGHT_ACCOUNT_FACTORY, // ERC4337 Factory to use
  salt: "0x01", // Recommended to use the hash of unique user id.
  owner: "0xOwnerAddress", // The new owner's address
});
console.log(`Signature: ${signature}`);
```

## Disclaimer

Please note that this contract and the accompanying TypeScript utility have **not** been audited. We encourage you to perform your own security analysis and audits before using them in production environments.

## License

This project is licensed under the LGPL-3.0-or-later License.

For additional resources and utilities related to address generation and code encoding, visit our [GitHub repository](https://github.com/deterministic-aa/monorepo).
