// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

interface IMultiOwnerPlugin {
    function ownersOf(address account) external view returns (address[] memory);
}
