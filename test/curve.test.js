const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const IWallet = artifacts.require("IWallet");
const CurveLogic = artifacts.require("CurveLogic");
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
const DAI_HOLDER = "0x13aec50f5d3c011cd3fed44e2a30c515bd8a5a06";

// TOKENS
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

// HELPERS
const toWei = (value) => web3.utils.toWei(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));

contract("Curve Logic", ([user, multisig]) => {
  let registry, wallet, curve, dai, usdc;

  before(async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [DAI_HOLDER],
    });

    dai = await IERC20.at(DAI_ADDRESS);
    usdc = await IERC20.at(USDC_ADDRESS);

    const EthaRegistry = await ethers.getContractFactory("EthaRegistry");

    curve = await CurveLogic.new();
    smartWalletImpl = await SmartWallet.new();

    const proxy = await upgrades.deployProxy(EthaRegistry, [
      smartWalletImpl.address,
      multisig,
      multisig,
      FEE,
    ]);

    registry = await EthaRegistryTruffle.at(proxy.address);

    await registry.enableLogicMultiple([curve.address]);

    await registry.deployWallet({ from: user });
    const swAddress = await registry.wallets(user);
    wallet = await IWallet.at(swAddress);
    await dai.transfer(wallet.address, toWei(100), { from: DAI_HOLDER });
  });

  it("should swap DAI for USDC in curve Synth Pool", async function () {
    const initial = await usdc.balanceOf(wallet.address);

    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "swapOnCurveSynth",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "src",
          },
          {
            type: "address",
            name: "dest",
          },
          {
            type: "uint256",
            name: "srcAmt",
          },
        ],
      },
      [DAI_ADDRESS, USDC_ADDRESS, toWei(100)]
    );

    const tx = await wallet.execute([curve.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogSwap", {
      src: DAI_ADDRESS,
      dest: USDC_ADDRESS,
      amount: toWei(100),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await usdc.balanceOf(wallet.address);
    assert(balance > initial);
  });

  it("should swap USDC for DAI in curve Comp Pool", async function () {
    const initial = await dai.balanceOf(wallet.address);

    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "swapOnCurveCompound",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "src",
          },
          {
            type: "address",
            name: "dest",
          },
          {
            type: "uint256",
            name: "srcAmt",
          },
        ],
      },
      [USDC_ADDRESS, DAI_ADDRESS, String(50e6)]
    );

    const tx = await wallet.execute([curve.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogSwap", {
      src: USDC_ADDRESS,
      dest: DAI_ADDRESS,
      amount: String(50e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await dai.balanceOf(wallet.address);
    assert(balance > initial);
  });
});
