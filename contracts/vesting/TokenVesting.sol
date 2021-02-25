//SPDX-License-Identifier: MIT
pragma solidity 0.7.3;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev A token holder contract that will allow a beneficiary to extract the
 * tokens after a given release time.
 *
 * Useful for simple vesting schedules like "advisors get all of their tokens
 * after 1 year".
 */
contract TokenVesting {
    using SafeMath for uint256;

    /// @notice Address who will receive tokens
    address public beneficiary;

    /// @notice Amount of tokens released so far
    uint256 public released;

    /// @notice Token address to release
    IERC20 public token;

    /// @notice List of dates(in unix timestamp) on which tokens will be released
    uint256[] public timeperiods;

    /// @notice Number of tokens to be released after each dates
    uint256[] public tokenAmounts;

    /// @notice Total number of periods released
    uint256 public periodsReleased;

    /// @notice Release Event
    event Released(uint256 amount, uint256 periods);

    /// @notice Initialize token vesting parameters
    function initialize(
        uint256[] memory periods,
        uint256[] memory tokenAmounts_,
        address beneficiary_,
        address token_
    ) external returns(bool){
        require(beneficiary_ == address(0), "Already Initialized!");
        for(uint256 i = 0; i < periods.length; i++) {
            timeperiods.push(periods[i]);
            tokenAmounts.push(tokenAmounts_[i]);
        }
        beneficiary = beneficiary_;
        token = IERC20(token_);

        return true;
    }

    /// @notice Release tokens to beneficiary
    /// @dev multiple periods can be released in one call
    function release() external {
        require(periodsReleased < timeperiods.length, "Nothing to release");
        uint256 amount = 0;
        for (uint256 i = periodsReleased; i < timeperiods.length; i++) {
            if (timeperiods[i] <= block.timestamp) {
                amount = amount.add(tokenAmounts[i]);
                periodsReleased = periodsReleased.add(1);
            }
            else {
                break;
            }
        }
        if(amount > 0) {
            IERC20(token).transfer(beneficiary, amount);
            emit Released(amount, periodsReleased);
        }

    }

    /// @notice Fetch amount that can be released at this moment
    function releaseableAmount() public view returns(uint) {
        uint256 amount = 0;
        for (uint256 i = periodsReleased; i < timeperiods.length; i++) {
            if (timeperiods[i] <= block.timestamp) {
                amount = amount.add(tokenAmounts[i]);
            }
            else {
                break;
            }
        }
        return amount;
    }

}
