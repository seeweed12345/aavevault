//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.3;
pragma experimental ABIEncoderV2;

interface IWallet {
    event LogMint(address indexed erc20, uint256 tokenAmt);
    event LogRedeem(address indexed erc20, uint256 tokenAmt);
    event LogBorrow(address indexed erc20, uint256 tokenAmt);
    event LogPayback(address indexed erc20, uint256 tokenAmt);
    event LogDeposit(address indexed erc20, uint256 tokenAmt);
    event LogWithdraw(address indexed erc20, uint256 tokenAmt);
    event LogSwap(address indexed src, address indexed dest, uint amount);
    event LogLiquidityAdd(address indexed tokenA, address indexed tokenB, uint amount);
    event LogLiquidityRemove(address indexed tokenA, address indexed tokenB, uint amount);
    event DelegateAdded(address delegate);  
    event DelegateRemoved(address delegate);

    function executeMetaTransaction(bytes memory sign, bytes memory data) external;

    function execute(
        address[] calldata targets,
        bytes[] calldata datas,
        bool shouldBurn
    ) external payable;

    function owner() external view returns(address);
    
    function isDelegate(address) external view returns(bool);
}