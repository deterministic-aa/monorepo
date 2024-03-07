// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {EnumerableMap} from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

using EnumerableMap for EnumerableMap.AddressToUintMap;

contract DeterministicAccountSigner is
    Ownable,
    EIP712,
    IERC1271,
    Initializable
{
    EnumerableMap.AddressToUintMap private _expirations;

    constructor(
        address initialOwner
    ) EIP712("DeterministicAccountSigner", "0.2.0") Ownable(initialOwner) {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        _transferOwnership(initialOwner);
    }

    function addSigner(address signer, uint256 expiration) external onlyOwner {
        require(signer != address(0), "invalid signer");
        require(expiration > block.timestamp, "invalid expiration");
        require(!_expirations.contains(signer), "signer already exists");
        _expirations.set(signer, expiration);
    }

    function removeSigner(address signer) external onlyOwner {
        require(_expirations.contains(signer), "signer does not exist");
        _expirations.remove(signer);
    }

    function getSigners() public view returns (address[] memory) {
        return _expirations.keys();
    }

    function getExpiration(address signer) public view returns (uint256) {
        return _expirations.get(signer);
    }

    function isValidSigner(address signer) public view returns (bool) {
        (bool exists, uint256 expiration) = _expirations.tryGet(signer);
        return exists && block.timestamp < expiration;
    }

    function isValidSignature(
        bytes32 hash,
        bytes memory signature
    ) external view returns (bytes4 magicValue) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(keccak256("MessageHash(bytes32 hash)"), hash))
        );
        address signer = ECDSA.recover(digest, signature);
        if (isValidSigner(signer)) {
            return IERC1271.isValidSignature.selector;
        } else {
            return 0x0;
        }
    }

    function isValidSignature(
        bytes memory message,
        bytes memory signature
    ) external view returns (bytes4 magicValue) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(keccak256("MessageHash(bytes hash)"), message))
        );
        address signer = ECDSA.recover(digest, signature);
        if (isValidSigner(signer)) {
            return 0x20c13b0b; // LEGACY TYPE
        } else {
            return 0x0;
        }
    }
}
