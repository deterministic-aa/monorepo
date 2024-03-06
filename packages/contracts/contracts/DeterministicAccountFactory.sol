// SPDX-License-Identifier: LGPL-3.0-or-later
pragma solidity ^0.8.24;
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
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

    constructor() EIP712("DeterministicAccountFactory", "0.1.0") {}

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
     * @param transferOwnershipCode Function call data to transfer ownership.
     * @param signature ECDSA signature for TypedDataV4
     * @return The address of the newly created account.
     */
    function createAccountWithSignature(
        address factory,
        uint256 salt,
        bytes calldata transferOwnershipCode,
        bytes calldata signature
    ) external payable returns (address) {
        address securedBy = _recoverSigner(
            factory,
            salt,
            transferOwnershipCode,
            signature
        );
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

    function _recoverSigner(
        address factory,
        uint256 salt,
        bytes memory transferOwnershipCode,
        bytes memory signature
    ) internal view returns (address) {
        bytes32 structHash = keccak256(
            abi.encode(
                CREATE_ACCOUNT_TYPEHASH,
                factory,
                salt,
                keccak256(transferOwnershipCode)
            )
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        return signer;
    }
}
