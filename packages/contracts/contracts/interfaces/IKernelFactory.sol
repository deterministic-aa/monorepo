// SPDX-License-Identifier: LGPL-3.0-or-later
pragma solidity ^0.8.24;

interface IKernelFactory {
    function createAccount(
        address _implementation,
        bytes calldata _data,
        uint256 _index
    ) external payable returns (address proxy);

    function getAccountAddress(
        bytes calldata _data,
        uint256 _index
    ) external view returns (address);
}
