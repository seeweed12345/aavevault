//SPDX-License-Identifier: MIT
pragma solidity 0.7.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../utils/CloneFactory.sol";
import "./TokenVesting.sol";

/**
 * @dev Deploys new vesting contracts
 */
contract VestingFactory is CloneFactory, Ownable {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event Vested(address indexed beneficiary, address vestingContract, address token, uint amount);

    /// @dev implementation address of Token Vesting
    address public implementation;

    /// @notice Address to Token Vesting map
    mapping(address => TokenVesting) public vestings;

    /// @dev Deploys a new proxy instance and sets custom owner of proxy
    /// Throws if the owner already have a UserWallet
    /// @return vesting - address of new Token Vesting Contract
    function deployVesting(
        uint256[] memory periods, 
        uint256[] memory tokenAmounts, 
        address beneficiary, 
        address token
    ) public returns (TokenVesting vesting) {
        require(implementation != address(0));
        require(
            vestings[beneficiary] == TokenVesting(0),
            "beneficiary exists"
        );

        address _vesting = address(uint160(createClone(implementation)));
        vesting = TokenVesting(_vesting);
        require(vesting.initialize(periods, tokenAmounts, beneficiary, token), "Initialization failed");

        // Calculate amount of tokens to vest
        uint amount = 0;
        for(uint i=0; i < tokenAmounts.length; i++){
            amount = amount.add(tokenAmounts[i]);
        }

        // Fund Token Vesting contract
        IERC20(token).safeTransferFrom(msg.sender, _vesting, amount);

        vestings[beneficiary] = vesting;

        assert(IERC20(token).balanceOf(_vesting) == amount);

        emit Vested(beneficiary, _vesting, address(token), amount);
    }

    /// @dev Change the address implementation of the Smart Wallet
    /// @param _impl new implementation address of Smart Wallet
    function setImplementation(address _impl) external onlyOwner {
        implementation = _impl;
    }
}
