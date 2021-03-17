//SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IBalancerPool.sol";
import "../interfaces/IBalancerRegistry.sol";

contract BalancerLogic {
    IBalancerRegistry internal constant REGISTRY = IBalancerRegistry(
        0x65e67cbc342712DF67494ACEfc06fe951EE93982
    );

    function swap(
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amount,
        uint256 poolIndex
    ) external {
        uint256 realAmount = amount == uint256(-1)
            ? fromToken.balanceOf(address(this))
            : amount;

        address[] memory pools = REGISTRY.getBestPoolsWithLimit(
            address(fromToken),
            address(destToken),
            poolIndex + 1
        );

        fromToken.approve(pools[poolIndex], realAmount);

        IBalancerPool(pools[poolIndex]).swapExactAmountIn(
            fromToken,
            realAmount,
            destToken,
            0,
            uint256(-1)
        );
    }
}