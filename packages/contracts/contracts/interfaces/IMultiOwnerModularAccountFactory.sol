// SPDX-License-Identifier: LGPL-3.0-or-later
pragma solidity ^0.8.24;

interface IMultiOwnerModularAccountFactory {
  function createAccount(
    uint256 salt,
    address[] memory owners
  ) external returns (address payable);

  function getAddress(
    uint256 salt,
    address[] memory owners
  ) external view returns (address);

  function MULTI_OWNER_PLUGIN() external view returns (address);
}
