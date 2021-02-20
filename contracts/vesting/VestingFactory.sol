//SPDX-License-Identifier: MIT
pragma solidity 0.7.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../utils/CloneFactory.sol";
import "./TokenTimelock.sol";

/**
 * @dev Deploys new vesting contracts
 */
contract VestingFactory is CloneFactory, Ownable {

    event Vested(address indexed beneficiary, address token, uint amount, uint releaseTime);

    /// @dev implementation address of Token Vesting
    address public implementation;

    /// @notice Address to Token Vesting map
    mapping(address => TokenTimelock) public vestings;

    /// @dev Deploys a new proxy instance and sets custom owner of proxy
    /// Throws if the owner already have a UserWallet
    /// @return vesting - address of new Token Vesting Contract
    function deployVesting(address beneficiary, IERC20 token, uint amount, uint releaseTime) public returns (TokenTimelock vesting) {
        require(
            vestings[beneficiary] == TokenTimelock(0),
            "beneficiary exists"
        );

        address _vesting = address(uint160(createClone(implementation)));
        vesting = TokenTimelock(_vesting);
        require(vesting.initialize(token, beneficiary, releaseTime));

        // Fund Token Vesting contract
        token.transferFrom(msg.sender, _vesting, amount);

        vestings[beneficiary] = vesting;

        emit Vested(beneficiary, address(token), amount, releaseTime);
    }

    /// @dev Change the address implementation of the Smart Wallet
    /// @param _impl new implementation address of Smart Wallet
    function setImplementation(address _impl) external onlyOwner {
        implementation = _impl;
    }
}
