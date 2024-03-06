// SPDX-License-Identifier: LGPL-3.0-or-later
pragma solidity ^0.8.24;

interface IERC4337Factory {
  function createAccount(
    address owner,
    uint256 salt
  ) external returns (address payable);

  function getAddress(
    address owner,
    uint256 salt
  ) external view returns (address);
}
