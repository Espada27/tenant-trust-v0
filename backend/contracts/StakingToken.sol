// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StakingToken
 * @dev ERC20 token for staking purposes.
 */
contract StakingToken is Ownable, ERC20 {
    /**
     * @dev Constructor for the StakingToken contract.
     */
    constructor() Ownable(msg.sender) ERC20("US Dollar Coin", "USDC") {
        _mint(msg.sender, 10_000_000_000 * 10 ** decimals());
    }
}
