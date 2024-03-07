import { Address, Hex, WalletClient } from "viem";

export enum SignerType {
  DETERMINISTIC_ACCOUNT_SIGNER,
  EOA,
  LIGHT_ACCOUNT,
}

export interface DeterministicAccountSigner {
  address: Address;
  type: SignerType.DETERMINISTIC_ACCOUNT_SIGNER;
  signerAddress: Address;
  signer: WalletClient;
}

export interface EOASigner {
  address: Address;
  type: SignerType.EOA;
  signer: WalletClient;
}

export interface LightAccountSigner {
  address: Address;
  type: SignerType.LIGHT_ACCOUNT;
  signerAddress: Address;
  signerPrivateKey: Hex;
}

export type SupportedSigner = EOASigner | LightAccountSigner | DeterministicAccountSigner;