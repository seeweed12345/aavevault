const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const IWallet = artifacts.require("IWallet");
const AaveLogic = artifacts.require("AaveLogic");
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
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ADAI = "0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d";
const ADAI_V2 = "0x028171bCA77440897B824Ca71D1c56caC55b68A3";
const AUSDC = "0x9bA00D6856a4eDF4665BcA2C2309936572473B7E";

// HELPERS
const toWei = (value) => web3.utils.toWei(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));

contract("Aave Logic", ([user, multisig]) => {
  let registry, wallet, aave, aaveEncode, dai, usdc, cdai;

  before(async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USER],
    });

    dai = await IERC20.at(DAI);
    usdc = await IERC20.at(USDC);
    adai = await IERC20.at(ADAI);
    adaiV2 = await IERC20.at(ADAI_V2);

    const EthaRegistry = await ethers.getContractFactory("EthaRegistry");

    aave = await AaveLogic.new();
    aaveEncode = new web3.eth.Contract(AaveLogic.abi, aave.address);
    smartWalletImpl = await SmartWallet.new();

    const proxy = await upgrades.deployProxy(EthaRegistry, [
      smartWalletImpl.address,
      multisig,
      multisig,
      FEE,
    ]);

    registry = await EthaRegistryTruffle.at(proxy.address);

    await registry.enableLogicMultiple([aave.address]);
    const tx = await registry.deployWallet({ from: user });
    const swAddress = await registry.wallets(user);
    wallet = await IWallet.at(swAddress);
    console.log("\tUSER SW:", swAddress);
    console.log("\tGas Used:", tx.receipt.gasUsed);

    // Fund wallet with DAI
    await dai.transfer(swAddress, toWei(200), { from: USER });
  });

  it("should supply DAI using V1", async function () {
    const data = await aaveEncode.methods
      .mintAToken(DAI, toWei(100))
      .encodeABI();

    const tx = await wallet.execute([aave.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogMint", {
      erc20: DAI,
      tokenAmt: toWei(100),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await adai.balanceOf(wallet.address);
    assert.equal(balance, toWei(100));
  });

  it("should supply DAI using V2", async function () {
    const data = await aaveEncode.methods
      .mintATokenV2(DAI, toWei(100))
      .encodeABI();

    const tx = await wallet.execute([aave.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogMint", {
      erc20: DAI,
      tokenAmt: toWei(100),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await adaiV2.balanceOf(wallet.address);
    assert.equal(String(balance), toWei(100));
  });

  it("should redeem DAI using V1", async function () {
    const data = await aaveEncode.methods
      .redeemAToken(ADAI, toWei(50))
      .encodeABI();

    const tx = await wallet.execute([aave.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogRedeem", {
      erc20: DAI,
      tokenAmt: toWei(50),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await dai.balanceOf(wallet.address);
    assert.equal(fromWei(balance), 50 * (1 - FEE / 100000));
  });

  it("should redeem DAI using V2", async function () {
    const data = await aaveEncode.methods
      .redeemATokenV2(ADAI_V2, toWei(50))
      .encodeABI();

    const tx = await wallet.execute([aave.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogRedeem", {
      erc20: DAI,
      tokenAmt: toWei(50),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await dai.balanceOf(wallet.address);
    assert.equal(fromWei(balance), 100 * (1 - FEE / 100000));
  });

  it("should borrow USDC using V1", async function () {
    // Enable Collateral
    const _data = await aaveEncode.methods.enableCollateral(DAI).encodeABI();
    await wallet.execute([aave.address], [_data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    const data = await aaveEncode.methods
      .borrow(USDC, String(10e6))
      .encodeABI();
    const tx = await wallet.execute([aave.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogBorrow", {
      erc20: USDC,
      tokenAmt: String(10e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await usdc.balanceOf(wallet.address);
    assert.equal(String(balance), String(10e6));
  });

  it("should borrow USDC using V2", async function () {
    const data = await aaveEncode.methods
      .borrowV2(USDC, String(10e6))
      .encodeABI();

    const tx = await wallet.execute([aave.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogBorrow", {
      erc20: USDC,
      tokenAmt: String(10e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await usdc.balanceOf(wallet.address);
    assert.equal(String(balance), 2 * Number(10e6));
  });

  it("should repay USDC using V1", async function () {
    const data = await aaveEncode.methods.repay(USDC, String(5e6)).encodeABI();
    const tx = await wallet.execute([aave.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogPayback", {
      erc20: USDC,
      tokenAmt: String(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await usdc.balanceOf(wallet.address);
    assert.equal(String(balance), String(15e6));
  });

  it("should repay USDC using V2", async function () {
    const data = await aaveEncode.methods
      .repayV2(USDC, String(5e6))
      .encodeABI();

    const tx = await wallet.execute([aave.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogPayback", {
      erc20: USDC,
      tokenAmt: String(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await usdc.balanceOf(wallet.address);
    assert.equal(String(balance), Number(10e6));
  });
});
