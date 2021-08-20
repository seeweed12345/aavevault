//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.3;
import "../interfaces/IVault.sol";
import "../interfaces/IUniswapV2Router.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "hardhat/console.sol";

contract Harvester is Ownable {
    using SafeMath for uint256;
    address public matic = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address public dai = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;
    IUniswapV2Router constant ROUTER = IUniswapV2Router(0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff);

    mapping (IVault => uint) public ratePerToken;
    
    function harvestVault(IVault vault, uint amount, uint outMin, address[] calldata path, uint deadline) public onlyAfterDelay(vault) {
		// Uniswap path
	address[] memory path = new address[](2);
	path[0] = matic;
	path[1] = dai;

		// Swap underlying to target
	from.approve(address(ROUTER), afterFee);
	uint256 received = ROUTER.swapExactTokensForTokens(
		afterFee,
		1,
		path,
		address(this),
		block.timestamp + 1
	)[path.length - 1];

		// Send profits to vault
	to.approve(address(vault), received);
	vault.distribute(received);

	emit Harvested(address(vault), msg.sender);
	}

    // no tokens should ever be stored on this contract. Any tokens that are sent here by mistake are recoverable by the owner
    function sweep(address _token) external onlyOwner {
        IERC20(_token).transfer(owner(), IERC20(_token).balanceOf(address(this)));
    }

}