//SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "../interfaces/IUniswapFactory.sol";
import "../interfaces/IUniswapV2Factory.sol";
import "../interfaces/IUniswapExchange.sol";
import "../interfaces/IUniswapV2Exchange.sol";
import "../interfaces/IUniswapV2Router.sol";
import "../interfaces/IWETH.sol";
import "../utils/UniversalERC20.sol";

import "hardhat/console.sol";

contract UniswapLogic {
    using SafeMath for uint256;
    using UniversalERC20 for IERC20;
    using UniversalERC20 for IWETH;
    using UniswapV2ExchangeLib for IUniswapV2Exchange;

    IUniswapFactory internal constant UNI_FACTORY = IUniswapFactory(
        0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95
    );

    IUniswapV2Factory internal constant UNI_FACTORY_V2 = IUniswapV2Factory(
        0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f
    );

    IUniswapV2Router internal constant UNI_ROUTER_V2 = IUniswapV2Router(
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
    );

    IWETH internal constant WETH = IWETH(
        0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
    );

    // EVENTS
    event LogSwap(address indexed src, address indexed dest, uint amount);
    event LogLiquidityAdd(address indexed tokenA, address indexed tokenB, uint amount);
    event LogLiquidityRemove(address indexed tokenA, address indexed tokenB, uint amount);

    function swapV1(
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amount
    ) external payable {
        require(fromToken != destToken, "SAME_TOKEN");
        require(amount > 0, "ZERO-AMOUNT");

        uint256 returnAmount = amount == uint256(-1)
            ? fromToken.balanceOf(address(this))
            : amount;

        if (!fromToken.isETH()) {
            IUniswapExchange fromExchange = UNI_FACTORY.getExchange(
                fromToken
            );

            if (fromExchange != IUniswapExchange(0)) {
                fromToken.universalApprove(address(fromExchange), returnAmount);
                returnAmount = fromExchange.tokenToEthSwapInput(
                    returnAmount,
                    1,
                    block.timestamp
                );
            }
        }

        if (!destToken.isETH()) {
            IUniswapExchange toExchange = UNI_FACTORY.getExchange(destToken);
            if (toExchange != IUniswapExchange(0)) {
                returnAmount = toExchange.ethToTokenSwapInput{value:returnAmount}(1, block.timestamp);
            }
        }

        emit LogSwap(address(fromToken), address(destToken), amount);
    }

    function swapV2(
        IERC20 fromToken,
        IERC20 destToken,
        uint256 amount
    ) external payable {
        require(fromToken != destToken, "SAME_TOKEN");
        require(amount > 0, "ZERO-AMOUNT");

        uint256 realAmt = amount == uint256(-1)
            ? fromToken.balanceOf(address(this))
            : amount;

        uint256 returnAmount = 0;

        if (fromToken.isETH()) {
            WETH.deposit{value:realAmt}();
        }

        IERC20 fromTokenReal = fromToken.isETH() ? WETH : fromToken;
        IERC20 toTokenReal = destToken.isETH() ? WETH : destToken;
        IUniswapV2Exchange exchange = UNI_FACTORY_V2.getPair(
            fromTokenReal,
            toTokenReal
        );
        returnAmount = exchange.getReturn(fromTokenReal, toTokenReal, realAmt);

        fromTokenReal.universalTransfer(address(exchange), realAmt);
        if (uint256(address(fromTokenReal)) < uint256(address(toTokenReal))) {
            exchange.swap(0, returnAmount, address(this), "");
        } else {
            exchange.swap(returnAmount, 0, address(this), "");
        }

        if (destToken.isETH()) {
            WETH.withdraw(WETH.balanceOf(address(this)));
        }

        emit LogSwap(address(fromToken), address(destToken), realAmt);
    }

    function addLiquidity(
        IERC20 tokenA,
        IERC20 tokenB,
        uint256 amtA,
        uint256 amtB
    ) external payable {
        uint256 realAmtA = amtA == uint256(-1)
            ? tokenA.universalBalanceOf(address(this))
            : amtA;

        uint256 realAmtB = amtB == uint256(-1)
            ? tokenB.universalBalanceOf(address(this))
            : amtB;

        IERC20 tokenAReal = tokenA.isETH() ? WETH : tokenA;
        IERC20 tokenBReal = tokenB.isETH() ? WETH : tokenB;

        // Wrap Ether
        if (tokenA.isETH()) {
            WETH.deposit{value:realAmtA}();
        }
        if (tokenB.isETH()) {
            WETH.deposit{value:realAmtB}();
        }

        // Approve Router
        tokenAReal.universalApprove(address(UNI_ROUTER_V2), realAmtA);
        tokenBReal.universalApprove(address(UNI_ROUTER_V2), realAmtB);   

        UNI_ROUTER_V2.addLiquidity(
            address(tokenAReal),
            address(tokenBReal),
            realAmtA,
            realAmtB,
            1,
            1,
            address(this),
            block.timestamp + 1
        );
    }

    function removeLiquidity(
        IERC20 tokenA,
        IERC20 tokenB,
        IERC20 poolToken,
        uint256 amtPoolTokens
    ) external payable {
        uint256 realAmt = amtPoolTokens == uint256(-1)
            ? poolToken.universalBalanceOf(address(this))
            : amtPoolTokens;

        // Approve Router
        poolToken.universalApprove(address(UNI_ROUTER_V2), realAmt);

        UNI_ROUTER_V2.removeLiquidity(
            address(tokenA),
            address(tokenB),
            realAmt,
            1,
            1,
            address(this),
            block.timestamp + 1
        );
    }
    
    receive() external payable {}
}
