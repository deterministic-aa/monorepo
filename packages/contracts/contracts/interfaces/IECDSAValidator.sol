// SPDX-License-Identifier: LGPL-3.0-or-later
pragma solidity ^0.8.24;

interface IECDSAValidator {
    function ecdsaValidatorStorage(
        address account
    ) external view returns (address);
}