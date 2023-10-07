// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract StakedMADA is ERC20 {
    constructor()
        ERC20("Staked mADA", "stMAda")
    {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount * 1 ether);
    }
}
