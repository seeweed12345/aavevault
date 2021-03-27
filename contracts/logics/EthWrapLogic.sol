//SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "../interfaces/IWETH.sol";

contract EthWrapLogic {
    IWETH internal constant weth = IWETH(
        0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
    );

    function wrap(uint256 amount) external payable {
        uint256 realAmt = amount == uint256(-1)
            ? address(this).balance
            : amount;
        weth.deposit{value:realAmt}();
    }

    function unwrap(uint256 amount) external {
        uint256 realAmt = amount == uint256(-1)
            ? weth.balanceOf(address(this))
            : amount;
        weth.withdraw(realAmt);
    }
}
