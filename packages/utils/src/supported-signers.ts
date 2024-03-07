import { Address, Hex, WalletClient } from "viem";

export enum SignerType {
  DETERMINISTIC_ACCOUNT_SIGNER,
  EOA,
  LIGHT_ACCOUNT,
}

export interface DeterministicAccountSigner {
  type: SignerType.DETERMINISTIC_ACCOUNT_SIGNER;
  address: Address;
  signer: WalletClient;
}

export interface EOASigner {
  type: SignerType.EOA;
  address: Address;
  signer: WalletClient;
}

export interface LightAccountSigner {
  type: SignerType.LIGHT_ACCOUNT;
  address: Address;
  privateKey: Hex;
}

export type SupportedSigner = EOASigner | LightAccountSigner | DeterministicAccountSigner;