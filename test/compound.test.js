const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const IWallet = artifacts.require("IWallet");
const CompoundLogic = artifacts.require("CompoundLogic");
const IERC20 = artifacts.require(
  "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20"
);

const {
  expectRevert,
  expectEvent,
  balance: ozBalance,
  constants: { MAX_UINT256 },
} = require("@openzeppelin/test-helpers");

const { assert } = require("hardhat");
const hre = require("hardhat");

const FEE = 1000;

const USER = "0x01Ec5e7e03e2835bB2d1aE8D2edDEd298780129c";

// TOKENS
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const CDAI_ADDRESS = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const CUSDC = "0x39AA39c021dfbaE8faC545936693aC917d5E7563";

// HELPERS
const toWei = (value) => web3.utils.toWei(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));

contract("Compound Logic", ([user, multisig]) => {
  let registry, wallet, compound, compoundEncode, dai, usdc, cdai;

  before(async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USER],
    });

    dai = await IERC20.at(DAI_ADDRESS);
    usdc = await IERC20.at(USDC);
    cdai = await IERC20.at(CDAI_ADDRESS);

    const EthaRegistry = await ethers.getContractFactory("EthaRegistry");

    compound = await CompoundLogic.new();
    compoundEncode = new web3.eth.Contract(CompoundLogic.abi, compound.address);
    smartWalletImpl = await SmartWallet.new();

    const proxy = await upgrades.deployProxy(EthaRegistry, [
      smartWalletImpl.address,
      multisig,
      multisig,
      FEE,
    ]);

    registry = await EthaRegistryTruffle.at(proxy.address);

    await registry.enableLogicMultiple([compound.address]);
    const tx = await registry.deployWallet({ from: user });
    const swAddress = await registry.wallets(user);
    wallet = await IWallet.at(swAddress);
    console.log("\tUSER SW:", swAddress);
    console.log("\tGas Used:", tx.receipt.gasUsed);

    // Fund wallet with DAI
    await dai.transfer(swAddress, toWei(100), { from: USER });
  });

  it("should supply DAI", async function () {
    const data = await compoundEncode.methods
      .mintCToken(DAI_ADDRESS, CDAI_ADDRESS, toWei(100))
      .encodeABI();

    const tx = await wallet.execute([compound.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogMint", {
      erc20: DAI_ADDRESS,
      tokenAmt: toWei(100),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await cdai.balanceOf(wallet.address);
    assert(balance > 0);
  });

  it("should redeem DAI", async function () {
    const data = await compoundEncode.methods
      .redeemUnderlying(DAI_ADDRESS, CDAI_ADDRESS, toWei(50))
      .encodeABI();

    const tx = await wallet.execute([compound.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogRedeem", {
      erc20: DAI_ADDRESS,
      tokenAmt: toWei(50),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await dai.balanceOf(wallet.address);
    assert.equal(fromWei(balance), 50 * (1 - FEE / 100000));
  });

  it("should borrow USDC", async function () {
    const data = await compoundEncode.methods
      .borrow(USDC, CUSDC, String(30e6))
      .encodeABI();

    const tx = await wallet.execute([compound.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogBorrow", {
      erc20: USDC,
      tokenAmt: String(30e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await usdc.balanceOf(wallet.address);
    assert.equal(String(balance), String(30e6));
  });

  it("should repay USDC debt", async function () {
    const data = await compoundEncode.methods
      .repayToken(USDC, CUSDC, String(10e6))
      .encodeABI();

    const tx = await wallet.execute([compound.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogPayback", {
      erc20: USDC,
      tokenAmt: String(10e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await usdc.balanceOf(wallet.address);
    assert.equal(String(balance), String(20e6));
  });
});
