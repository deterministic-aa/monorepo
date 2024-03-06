// SPDX-License-Identifier: LGPL-3.0-or-later
pragma solidity ^0.8.24;

interface IOwnable {
  function owner() external view returns (address);
}