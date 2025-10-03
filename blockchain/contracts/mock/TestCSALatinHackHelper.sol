// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../CSA_LatinHack.sol";

// Este contrato hereda de CSA_LatinHack para exponer la función interna '_mint' y poder probarla.
contract TestCSALatinHackHelper is CSA_LatinHack {
    constructor(address initialOwner) CSA_LatinHack(initialOwner) {}

    function testMint(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount);
    }
}