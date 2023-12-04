// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TenantTrustTokenTest is Ownable, ERC20 {
    constructor() Ownable(msg.sender) ERC20("Tenant Trust Token", "TTT") {
        _mint(msg.sender, 10_000_000 * 10 ** decimals());
    }

    function mint(address _to, uint _amount) external onlyOwner {
        _mint(_to, _amount);
    }
}
