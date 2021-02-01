const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const TransferLogic = artifacts.require("TransferLogic");
const UniswapLogic = artifacts.require("UniswapLogic");
const Vault = artifacts.require("Vault");
const YTokenStrat = artifacts.require("YTokenStrat");
const IERC20 = artifacts.require(
  "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20"
);

const {
  expectRevert,
  balance: ozBalance,
  constants: { MAX_UINT256 },
} = require("@openzeppelin/test-helpers");
const { assertion } = require("@openzeppelin/test-helpers/src/expectRevert");

// const { assert } = require("hardhat");
const hre = require("hardhat");

const FEE = 1000;
const USER = "0xdd79dc5b781b14ff091686961adc5d47e434f4b0";
const MULTISIG = "0x9Fd332a4e9C7F2f0dbA90745c1324Cc170D16fE4";

// TOKENS
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const YDAI_ADDRESS = "0xacd43e627e64355f1861cec6d3a6688b31a6f952";

// HELPERS
const toWei = (value) => web3.utils.toWei(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));

contract("Inverse Vaults", () => {
  let registry, wallet, transfers, strat, uniswap, vault;

  before(async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USER],
    });

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [MULTISIG],
    });

    dai = await IERC20.at(DAI_ADDRESS);

    const EthaRegistry = await ethers.getContractFactory("EthaRegistry");

    transfers = await TransferLogic.new();
    uniswap = await UniswapLogic.new();
    smartWalletImpl = await SmartWallet.new();

    const proxy = await upgrades.deployProxy(EthaRegistry, [
      smartWalletImpl.address,
      MULTISIG,
      MULTISIG,
      FEE,
    ]);

    registry = await EthaRegistryTruffle.at(proxy.address);

    await registry.enableLogicMultiple([transfers.address, uniswap.address]);

    // Smart Wallet Creation
    const tx = await registry.deployWallet({ from: USER });
    const swAddress = await registry.wallets(USER);
    wallet = await SmartWallet.at(swAddress);
  });

  it("should deploy the vault contract", async function () {
    vault = await Vault.new(
      DAI_ADDRESS,
      WETH_ADDRESS,
      MULTISIG,
      "Test DAI to ETH Vault",
      "testDAI>ETH"
    );
  });

  it("should deploy the YTokenStrat contract", async function () {
    strat = await YTokenStrat.new(vault.address, YDAI_ADDRESS);
  });

  it("Should connect Strat to Vault", async function () {
    await vault.setStrat(strat.address, false);
    assert.equal(await vault.strat(), strat.address);
    assert.equal(await vault.paused(), false);
  });
});
