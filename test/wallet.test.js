const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const UniswapLogic = artifacts.require("UniswapLogic");
const AaveLogic = artifacts.require("AaveLogic");
const TransferLogic = artifacts.require("TransferLogic");
const DyDxLogic = artifacts.require("DyDxLogic");
const CompoundLogic = artifacts.require("CompoundLogic");
const IERC20 = artifacts.require(
  "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20"
);

const {
  expectRevert,
  constants: { MAX_UINT256 },
} = require("@openzeppelin/test-helpers");
const { assertion } = require("@openzeppelin/test-helpers/src/expectRevert");
const hre = require("hardhat");

const FEE = 1000;
const USER = "0xdd79dc5b781b14ff091686961adc5d47e434f4b0";
const MULTISIG = "0x9Fd332a4e9C7F2f0dbA90745c1324Cc170D16fE4";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

contract("Smart Wallet", () => {
  let registry, wallet, transfers, compound, aave, dydx, uniswap;

  before(async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USER],
    });

    dai = await IERC20.at(DAI_ADDRESS);

    const EthaRegistry = await ethers.getContractFactory("EthaRegistry");

    transfers = await TransferLogic.new();
    compound = await CompoundLogic.new();
    aave = await AaveLogic.new();
    dydx = await DyDxLogic.new();
    uniswap = await UniswapLogic.new();
    smartWalletImpl = await SmartWallet.new();

    const proxy = await upgrades.deployProxy(EthaRegistry, [
      smartWalletImpl.address,
      MULTISIG,
      MULTISIG,
      FEE,
    ]);

    registry = await EthaRegistryTruffle.at(proxy.address);

    await registry.enableLogicMultiple([
      transfers.address,
      uniswap.address,
      aave.address,
      compound.address,
      dydx.address,
    ]);
  });

  it("should deploy a smart wallet", async function () {
    await registry.deployWallet({ from: USER });
    const swAddress = await registry.wallets(USER);
    wallet = await SmartWallet.at(swAddress);
    console.log("\tUSER SW:", swAddress);
  });

  it("should deposit funds to the smart wallet", async function () {
    await dai.approve(wallet.address, MAX_UINT256, {
      from: USER,
    });

    console.log("\tDepositing 100 DAI with function");
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "deposit",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "erc20",
          },
          {
            type: "uint256",
            name: "amount",
          },
        ],
      },
      [DAI_ADDRESS, String(100e18)]
    );

    const tx = await wallet.execute([transfers.address], [data], false, {
      from: USER,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await dai.balanceOf(wallet.address);
    assert.equal(balance, String(100e18));
  });
});
