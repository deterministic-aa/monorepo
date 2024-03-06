# @deterministic-aa/utils

The `@deterministic-aa/utils` package offers TypeScript utilities to support the creation and management of deterministic accounts. It provides functions for computing deterministic addresses, generating transfer ownership codes, and creating signatures for account deployment and management.

## Features

- Compute Deterministic Addresses
- Generate Transfer Ownership Codes
- Create Signatures for Account Creation

## Installation

```bash
npm install @deterministic-aa/utils
```

## Usage

Import the necessary functions from the package:

```typescript
import { getDeterministicAddress, getTransferOwnershipCode, getCreateAccountSignature } from "@deterministic-aa/utils";
```

Use these functions to compute addresses, generate ownership transfer codes, and sign account creation requests securely.

### Example: Computing a Deterministic Address

```typescript
const address = getDeterministicAddress({
  factory: "YourFactoryAddress",
  salt: "YourUniqueSalt",
  securedBy: "SecuringAddress",
});
console.log(`Deterministic Address: ${address}`);
```

## Disclaimer

This package and its utilities have not been audited. Use at your own risk. Conduct thorough security reviews before using in production environments.

## License

This project is licensed under the LGPL-3.0-or-later License.
