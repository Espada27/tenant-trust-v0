// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TenantTrustToken
 * @dev ERC20 token for the TenantTrust system.
 */
contract TenantTrustToken is Ownable, ERC20 {
    /**
     * @dev Constructor for the TenantTrustToken contract.
     */
    constructor() Ownable(msg.sender) ERC20("Tenant Trust Token", "TTT") {
        _mint(msg.sender, 10_000_000 * 10 ** decimals());
    }
}
