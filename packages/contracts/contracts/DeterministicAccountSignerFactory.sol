// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {DeterministicAccountSigner} from "./DeterministicAccountSigner.sol";

using Clones for address;

contract DeterministicAccountSignerFactory {
    address public immutable implementation;

    constructor() {
        implementation = address(new DeterministicAccountSigner(address(this)));
    }

    function createDeterministicAccountSigner(
        address owner,
        uint256 salt
    ) public returns (DeterministicAccountSigner signer) {
        address addr = getDeterministicAccountSignerAddress(owner, salt);
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return DeterministicAccountSigner(addr);
        }
        bytes32 deploySalt = keccak256(abi.encodePacked(owner, salt));
        signer = DeterministicAccountSigner(
            implementation.cloneDeterministic(deploySalt)
        );
        signer.initialize(owner);
    }

    function getDeterministicAccountSignerAddress(
        address owner,
        uint256 salt
    ) public view returns (address signer) {
        bytes32 deploySalt = keccak256(abi.encodePacked(owner, salt));
        return implementation.predictDeterministicAddress(deploySalt);
    }
}
