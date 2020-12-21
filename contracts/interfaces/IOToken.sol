pragma solidity ^0.5.0;


// Kovan
// cDAI 0xe7bc397DBd069fC7d0109C0636d06888bb50668c
// oCDAI 0xd344828e67444f0921822e83d83d009B85B04454

contract IoToken {
    /**
     * @notice opens a Vault, adds ETH collateral, and mints new oTokens in one step
     * Remember that creating oTokens can put the owner at a risk of losing the collateral
     * if an exercise event happens.
     * The sell function provides the owner a chance to earn premiums.
     * Ensure that you create and immediately sell oTokens atmoically.
     * @param amtToCreate number of oTokens to create
     * @param receiver address to send the Options to
     */
    function createETHCollateralOption(uint256 amtToCreate, address receiver)
        external
        payable;

    /**
     * @notice adds ETH collateral, and mints new oTokens in one step to an existing Vault
     * Remember that creating oTokens can put the owner at a risk of losing the collateral
     * if an exercise event happens.
     * The sell function provides the owner a chance to earn premiums.
     * Ensure that you create and immediately sell oTokens atmoically.
     * @param amtToCreate number of oTokens to create
     * @param receiver address to send the Options to
     */
    function addETHCollateralOption(uint256 amtToCreate, address receiver)
        external
        payable;

    /**
     * @notice opens a Vault, adds ETH collateral, mints new oTokens and sell in one step
     * @param amtToCreate number of oTokens to create
     * @param receiver address to receive the premiums
     */
    function createAndSellETHCollateralOption(
        uint256 amtToCreate,
        address payable receiver
    ) external payable;

    /**
     * @notice adds ETH collateral to an existing Vault, and mints new oTokens and sells the oTokens in one step
     * @param amtToCreate number of oTokens to create
     * @param receiver address to send the Options to
     */
    function addAndSellETHCollateralOption(
        uint256 amtToCreate,
        address payable receiver
    ) external payable;

    /**
     * @notice opens a Vault, adds ERC20 collateral, and mints new oTokens in one step
     * Remember that creating oTokens can put the owner at a risk of losing the collateral
     * if an exercise event happens.
     * The sell function provides the owner a chance to earn premiums.
     * Ensure that you create and immediately sell oTokens atmoically.
     * @param amtToCreate number of oTokens to create
     * @param amtCollateral amount of collateral added
     * @param receiver address to send the Options to
     */
    function createERC20CollateralOption(
        uint256 amtToCreate,
        uint256 amtCollateral,
        address receiver
    ) external;

    /**
     * @notice adds ERC20 collateral, and mints new oTokens in one step
     * Remember that creating oTokens can put the owner at a risk of losing the collateral
     * if an exercise event happens.
     * The sell function provides the owner a chance to earn premiums.
     * Ensure that you create and immediately sell oTokens atmoically.
     * @param amtToCreate number of oTokens to create
     * @param amtCollateral amount of collateral added
     * @param receiver address to send the Options to
     */
    function addERC20CollateralOption(
        uint256 amtToCreate,
        uint256 amtCollateral,
        address receiver
    ) external;

    /**
     * @notice opens a Vault, adds ERC20 collateral, mints new oTokens and sells the oTokens in one step
     * @param amtToCreate number of oTokens to create
     * @param amtCollateral amount of collateral added
     * @param receiver address to send the Options to
     */
    function createAndSellERC20CollateralOption(
        uint256 amtToCreate,
        uint256 amtCollateral,
        address payable receiver
    ) external;

    /**
     * @notice adds ERC20 collateral, mints new oTokens and sells the oTokens in one step
     * @param amtToCreate number of oTokens to create
     * @param amtCollateral amount of collateral added
     * @param receiver address to send the Options to
     */
    function addAndSellERC20CollateralOption(
        uint256 amtToCreate,
        uint256 amtCollateral,
        address payable receiver
    ) external;

    /**
     * @notice This function gets the array of vaultOwners
     */
    function getVaultOwners() external view returns (address payable[] memory);

    /**
     * @notice Checks if a `owner` has already created a Vault
     * @param owner The address of the supposed owner
     * @return true or false
     */
    function hasVault(address payable owner) public view returns (bool);

    /**
     * @notice Creates a new empty Vault and sets the owner of the vault to be the msg.sender.
     */
    function openVault() external returns (bool);

    /**
     * @notice Returns the amount of underlying to be transferred during an exercise call
     */
    function underlyingRequiredToExercise(uint256 oTokensToExercise)
        external
        view
        returns (uint256);

    /**
     * @notice Returns the vault for a given address
     * @param vaultOwner the owner of the Vault to return
     */
    function getVault(address payable vaultOwner)
        external
        view
        returns (uint256, uint256, uint256, bool);

    /**
     * @notice after expiry, each vault holder can get back their proportional share of collateral
     * from vaults that they own.
     * @dev The owner gets all of their collateral back if no exercise event took their collateral.
     */
    function redeemVaultBalance() external;

    /**
     * This function returns the maximum amount of collateral liquidatable if the given vault is unsafe
     * @param vaultOwner The index of the vault to be liquidated
     */
    function maxOTokensLiquidatable(address payable vaultOwner)
        external
        view
        returns (uint256);

    /**
     * This function returns the maximum amount of oTokens that can safely be issued against the specified amount of collateral.
     * @param collateralAmt The amount of collateral against which oTokens will be issued.
     */
    function maxOTokensIssuable(uint256 collateralAmt)
        external
        view
        returns (uint256);

    function exercise(
        uint256 oTokensToExercise,
        address payable[] calldata vaultsToExerciseFrom
    ) external payable;

    function liquidate(address payable vaultOwner, uint256 oTokensToLiquidate)
        external;

    function burnOTokens(uint256 amtToBurn) external;

    function hasExpired() external view returns (bool);

    function oTokenExchangeRate() external view returns (uint256, int32);
}
