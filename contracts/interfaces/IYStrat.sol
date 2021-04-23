//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.3;

interface IYStrat {
    event Harvested(uint256 profit, uint256 loss, uint256 debtPayment, uint256 debtOutstanding);
    
    function harvest() external;
}