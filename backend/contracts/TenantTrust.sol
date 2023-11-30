// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

contract TenantTrust is Ownable {
    constructor() Ownable(msg.sender) {}
}
