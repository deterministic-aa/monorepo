import {
  Address,
  Hex,
  PublicClient,
  encodePacked,
  hexToBigInt,
  keccak256,
  toHex,
  hashTypedData,
} from "viem";
import { SupportedSigner, SignerType } from "./supported-signers";
import { SupportedFactory } from "./supported-factories";
import {
  getLightAccountAddress,
  getLightAccountTransferOwnershipCode,
  getLightAccountSignature,
} from "./account-types/light-account";
import { DETERMINISTIC_AA_V010 } from "./constants";

export type Salt = Hex | bigint;

const saltToHex = (salt: Salt): Hex => {
  const uint256Val = typeof salt === "bigint" ? salt : hexToBigInt(salt);
  return toHex(uint256Val, { size: 32 });
};

const saltToBigInt = (salt: Salt): bigint => {
  if (typeof salt === "bigint") {
    return salt;
  }
  return hexToBigInt(salt);
};

export type GetDeterministicAddressInput = {
  factory: SupportedFactory;
  salt: Salt;
  securedBy: Address;
  daFactory?: Address;
};

export const getDeterministicAddress = (args: GetDeterministicAddressInput) => {
  const { factory, salt, securedBy, daFactory } = args;
  // uint256 can be replaced with bytes32 in the keccak256 call
  const wrappedSalt = keccak256(
    encodePacked(["address", "bytes32"], [securedBy, saltToHex(salt)])
  );
  switch (factory) {
    case SupportedFactory.LIGHT_ACCOUNT_FACTORY: {
      return getLightAccountAddress(wrappedSalt, daFactory);
    }
    default:
      throw new Error("Unsupported factory");
  }
};

export type GetTransferOwnershipCodeInput = {
  factory: SupportedFactory;
  owner: Address;
};

export const getTransferOwnershipCode = (
  args: GetTransferOwnershipCodeInput
) => {
  const { factory, owner } = args;
  switch (factory) {
    case SupportedFactory.LIGHT_ACCOUNT_FACTORY: {
      return getLightAccountTransferOwnershipCode(owner);
    }
    default:
      throw new Error("Unsupported factory");
  }
};

export type GetSignatureForSecuredAccount = {
  publicClient: PublicClient;
  securedBy: Address;
  signer: SupportedSigner;
  factory: SupportedFactory;
  salt: Salt;
  owner: Address;
  daFactory?: Address;
};

export const getSignatureForSecuredAccount = async (
  args: GetSignatureForSecuredAccount
): Promise<Hex> => {
  const { publicClient, signer, securedBy, factory, salt, owner, daFactory } =
    args;
  const transferOwnershipCode = getTransferOwnershipCode({ factory, owner });
  const _daFactory = daFactory || DETERMINISTIC_AA_V010;
  const [, name, version, chainId, verifyingContract, ,] =
    await publicClient.readContract({
      address: _daFactory,
      abi: [
        {
          inputs: [],
          name: "eip712Domain",
          outputs: [
            {
              internalType: "bytes1",
              name: "fields",
              type: "bytes1",
            },
            {
              internalType: "string",
              name: "name",
              type: "string",
            },
            {
              internalType: "string",
              name: "version",
              type: "string",
            },
            {
              internalType: "uint256",
              name: "chainId",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "verifyingContract",
              type: "address",
            },
            {
              internalType: "bytes32",
              name: "salt",
              type: "bytes32",
            },
            {
              internalType: "uint256[]",
              name: "extensions",
              type: "uint256[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "eip712Domain",
    });
  const digest = hashTypedData({
    domain: {
      name,
      version,
      chainId: parseInt(chainId.toString()),
      verifyingContract,
    },
    types: {
      CreateAccount: [
        {
          type: "address",
          name: "factory",
        },
        {
          type: "uint256",
          name: "salt",
        },
        {
          type: "bytes",
          name: "transferOwnershipCode",
        },
      ],
    },
    primaryType: "CreateAccount",
    message: {
      factory,
      salt: saltToBigInt(salt),
      transferOwnershipCode,
    },
  });

  switch (signer.type) {
    case SignerType.DETERMINISTIC_ACCOUNT_SIGNER:
    case SignerType.EOA: {
      const signature = await signer.signer.signTypedData({
        account: signer.address,
        domain: {
          name,
          version,
          chainId: parseInt(chainId.toString()),
          verifyingContract,
        },
        types: {
          CreateAccount: [
            {
              type: "address",
              name: "factory",
            },
            {
              type: "uint256",
              name: "salt",
            },
            {
              type: "bytes",
              name: "transferOwnershipCode",
            },
          ],
        },
        primaryType: "CreateAccount",
        message: {
          factory,
          salt: saltToBigInt(salt),
          transferOwnershipCode,
        },
      });
      return signature;
    }
    // secured by light account
    case SignerType.LIGHT_ACCOUNT: {
      const signature = await getLightAccountSignature({
        publicClient,
        account: signer,
        digest,
      });
      return signature;
    }
    default: {
      throw new Error("Unsupported account type");
    }
  }
};
