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

    event Created(address beneficiary, address vestingContract);

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
        require(vesting.initialize(periods, tokenAmounts, beneficiary, token), "!Initialized");

        vestings[beneficiary] = vesting;

        emit Created(beneficiary, _vesting);
    }

    /// @dev Change the address implementation of the Smart Wallet
    /// @param _impl new implementation address of Smart Wallet
    function setImplementation(address _impl) external onlyOwner {
        implementation = _impl;
    }
}