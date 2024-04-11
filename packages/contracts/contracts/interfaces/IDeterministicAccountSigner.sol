// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

/**
 * @title IDeterministicAccountSigner
 * @notice Interface for the DeterministicAccountSigner contract to manage signers with expiration times.
 */
interface IDeterministicAccountSigner {
    /**
     * @notice Initializes the contract with the specified initial owner. This function can only be called once.
     * @param initialOwner The address of the initial owner.
     */
    function initialize(address initialOwner) external;

    /**
     * @notice Adds a new signer with an expiration time. This function can only be called by the contract owner.
     * @param signer The address of the signer to add.
     * @param expiration The timestamp when the signer's permission will expire.
     */
    function addSigner(address signer, uint256 expiration) external;

    /**
     * @notice Removes an existing signer. This function can only be called by the contract owner.
     * @param signer The address of the signer to remove.
     */
    function removeSigner(address signer) external;

    /**
     * @notice Retrieves the list of all signers.
     * @return An array of addresses representing the signers.
     */
    function getSigners() external view returns (address[] memory);

    /**
     * @notice Retrieves the expiration time for a specific signer.
     * @param signer The address of the signer.
     * @return The timestamp when the signer's permission will expire.
     */
    function getExpiration(address signer) external view returns (uint256);

    /**
     * @notice Checks if a given address is a valid signer as of the current time.
     * @param signer The address to check.
     * @return True if the address is a valid signer, false otherwise.
     */
    function isValidSigner(address signer) external view returns (bool);

    /**
     * @notice Verifies if a given hash and signature pair is valid. It uses EIP-712 typed data signing.
     * @param hash The hash of the typed data.
     * @param signature The signature to verify.
     * @return magicValue The EIP-1271 magic value if the signature is valid, 0x0 otherwise.
     */
    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4 magicValue);

    /**
     * @notice Verifies if a given message and signature pair is valid. It's an alternative function for legacy message signing.
     * @param message The message that was signed.
     * @param signature The signature to verify.
     * @return magicValue A specific legacy magic value if the signature is valid, 0x0 otherwise.
     */
    function isValidSignature(bytes memory message, bytes memory signature) external view returns (bytes4 magicValue);
}
