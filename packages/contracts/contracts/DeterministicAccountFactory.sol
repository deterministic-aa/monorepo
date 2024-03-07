// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {IERC4337Factory} from "./interfaces/IERC4337Factory.sol";
import {IOwnable} from "./interfaces/IOwnable.sol";

/**
 * @title DeterministicAccountFactory
 * @notice Interface for creating deterministic ERC4337 accounts using factories.
 * @dev Deploys ERC4337 accounts deterministically based on `salt` and `securedBy` (manager's address).
 * Supports non-custodial account creation and ownership transfer via factories like LightAccountFactory.
 * Enables securing accounts until users are ready to assume control. Transfer ownership codes must be ABI-encoded
 * specifically for the account's factory. Utilities for address generation and code encoding available at
 * https://github.com/deterministic-aa/monorepo.
 */
contract DeterministicAccountFactory is EIP712 {
    bytes32 private constant CREATE_ACCOUNT_TYPEHASH =
        keccak256(
            "CreateAccount(address factory,uint256 salt,bytes transferOwnershipCode)"
        );

    /**
     * @notice Emitted when a new account is created.
     * @param factory The factory address used for account creation.
     * @param securedBy The address that secured the account.
     * @param account The address of the newly created account.
     * @param owner The address that owns the newly created account.
     */
    event AccountCreated(
        address indexed factory,
        address indexed securedBy,
        address account,
        address owner
    );

    constructor() EIP712("DeterministicAccountFactory", "0.2.0") {}

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
    ) external payable returns (address) {
        return _createAccount(factory, msg.sender, salt, transferOwnershipCode);
    }

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
    ) external payable returns (address) {
        bool isValidSignature = hasValidSignature(
            factory,
            salt,
            transferOwnershipCode,
            securedBy,
            signature
        );
        require(isValidSignature, "Invalid signature");
        return _createAccount(factory, securedBy, salt, transferOwnershipCode);
    }

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
    ) public view returns (address) {
        uint256 wrappedSalt = uint256(
            keccak256(abi.encodePacked(securedBy, salt))
        );
        return IERC4337Factory(factory).getAddress(address(this), wrappedSalt);
    }

    /**
     * @notice Verifies if a signature is valid for the given account creation parameters.
     * @dev This function checks the validity of a signature given the account creation parameters.
     * It supports verification for both Externally Owned Accounts (EOAs) and smart contract accounts implementing EIP-1271.
     * For EOAs, it uses ECDSA signature recovery to compare the signer's address with `securedBy`.
     * For smart contract accounts, it calls the `isValidSignature` function of the EIP-1271 standard.
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
    ) public view returns (bool) {
        bytes32 hashed = _hashCreateAccountCode(
            factory,
            salt,
            transferOwnershipCode
        );
        if (securedBy.code.length > 0) {
            // Smart Contract Account
            return
                IERC1271(securedBy).isValidSignature(hashed, signature) ==
                IERC1271.isValidSignature.selector;
        } else {
            // Externally Owned Account
            return ECDSA.recover(hashed, signature) == securedBy;
        }
    }

    function _createAccount(
        address factory,
        address securedBy,
        uint256 salt,
        bytes calldata transferOwnershipCode
    ) internal returns (address) {
        uint256 wrappedSalt = uint256(
            keccak256(abi.encodePacked(securedBy, salt))
        );
        address payable account = IERC4337Factory(factory).createAccount(
            address(this),
            wrappedSalt
        );
        address computed = getDeterministicAddress(factory, securedBy, salt);
        require(
            account == computed,
            "Deployed account address does not match predicted address"
        );
        (bool success, ) = account.call{value: msg.value}(
            transferOwnershipCode
        );
        require(success, "Transfer ownership failed");
        address owner = IOwnable(account).owner();
        emit AccountCreated(factory, securedBy, account, owner);
        return account;
    }

    function _hashCreateAccountCode(
        address factory,
        uint256 salt,
        bytes memory transferOwnershipCode
    ) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                CREATE_ACCOUNT_TYPEHASH,
                factory,
                salt,
                keccak256(transferOwnershipCode)
            )
        );
        return _hashTypedDataV4(structHash);
    }
}
