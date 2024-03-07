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
        address signer = ECDSA.recover(hash, signature);
        if (isValidSigner(signer)) {
            return this.isValidSignature.selector;
        } else {
            return 0x0;
        }
    }
}
