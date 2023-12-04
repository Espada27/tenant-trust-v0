// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakingToken is Ownable, ERC20 {
    constructor() Ownable(msg.sender) ERC20("US Dollar Coin", "USDC") {
        _mint(msg.sender, 10_000_000_000 * 10 ** decimals());
    }
}
