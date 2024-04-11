// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

/**
 * @title IDeterministicAccountFactory
 * @notice Interface for creating and managing deterministic ERC4337 accounts.
 */
interface IDeterministicAccountFactory {
    /**
     * @notice Creates a new account with specified parameters.
     * @param factory The factory address to use for creating the account.
     * @param salt A unique salt to ensure address determinism.
     * @param transferOwnershipCode Function call data to transfer ownership.
     * @return The address of the newly created account.
     */
    function createAccount(
        address factory,
        uint256 salt,
        bytes calldata transferOwnershipCode
    ) external payable returns (address);

    /**
     * @notice Creates a new account with specified parameters and signature verification.
     * @param factory The factory address to use for creating the account.
     * @param salt A unique salt to ensure address determinism.
     * @param securedBy The address that secured the account.
     * @param signature ECDSA signature for TypedDataV4
     * @param transferOwnershipCode Function call data to transfer ownership.
     * @return The address of the newly created account.
     */
    function createSecuredAccount(
        address factory,
        uint256 salt,
        address securedBy,
        bytes calldata signature,
        bytes calldata transferOwnershipCode
    ) external payable returns (address);

    /**
     * @notice Computes the deterministic address for an account given the parameters.
     * @param factory The factory address used for account creation.
     * @param securedBy The address securing the account.
     * @param salt A unique salt to ensure address determinism.
     * @return The computed deterministic address.
     */
    function getDeterministicAddress(
        address factory,
        address securedBy,
        uint256 salt
    ) external view returns (address);

    /**
     * @notice Verifies if a signature is valid for the given account creation parameters.
     * @param factory The factory address to use for creating the account.
     * @param salt A unique salt to ensure address determinism.
     * @param transferOwnershipCode Function call data to transfer ownership.
     * @param securedBy The address securing the account.
     * @param signature ECDSA signature for TypedDataV4
     * @return isValid A boolean value indicating whether the signature is valid (`true`) or not (`false`).
     */
    function hasValidSignature(
        address factory,
        uint256 salt,
        bytes calldata transferOwnershipCode,
        address securedBy,
        bytes calldata signature
    ) external view returns (bool);
}
