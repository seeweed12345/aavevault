const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const IWallet = artifacts.require("IWallet");
const BalancerLogic = artifacts.require("BalancerLogic");
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

const FEE = 1000;

// TOKENS
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const BPT = "0x7aFE74AE3C19f070c109A38C286684256ADC656C"; //WETH/DAI 50-50

// HELPERS
const toWei = (value) => web3.utils.toWei(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));

contract("Balancer Logic", ([user, multisig]) => {
  let registry, wallet, balancer, dai, bpt, weth;

  before(async function () {
    dai = await IERC20.at(DAI_ADDRESS);
    bpt = await IERC20.at(BPT);
    weth = await IERC20.at(WETH_ADDRESS);

    const EthaRegistry = await ethers.getContractFactory("EthaRegistry");

    balancer = await BalancerLogic.new();
    smartWalletImpl = await SmartWallet.new();

    const proxy = await upgrades.deployProxy(EthaRegistry, [
      smartWalletImpl.address,
      multisig,
      multisig,
      FEE,
    ]);

    registry = await EthaRegistryTruffle.at(proxy.address);

    await registry.enableLogicMultiple([balancer.address]);
  });

  it("should deploy a smart wallet", async function () {
    const tx = await registry.deployWallet({ from: user });
    const swAddress = await registry.wallets(user);
    wallet = await IWallet.at(swAddress);
    console.log("\tUSER SW:", swAddress);
    console.log("\tGas Used:", tx.receipt.gasUsed);
  });

  it("should swap ETH for DAI in balancer", async function () {
    const initial = await dai.balanceOf(wallet.address);

    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "swap",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "fromToken",
          },
          {
            type: "address",
            name: "destToken",
          },
          {
            type: "uint256",
            name: "amount",
          },
          {
            type: "uint256",
            name: "poolIndex",
          },
        ],
      },
      [ETH_ADDRESS, DAI_ADDRESS, toWei(1), 0]
    );

    const tx = await wallet.execute([balancer.address], [data], false, {
      from: user,
      value: toWei(1),
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogSwap", {
      src: ETH_ADDRESS,
      dest: DAI_ADDRESS,
      amount: toWei(1),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await dai.balanceOf(wallet.address);
    assert(balance > initial);
  });

  it("should add ETH/DAI liquidity in balancer", async function () {
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "addLiquidity",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "poolAddress",
          },
          {
            type: "address",
            name: "tokenIn",
          },
          {
            type: "uint256",
            name: "amountIn",
          },
        ],
      },
      [BPT, DAI_ADDRESS, toWei(1000)]
    );

    const tx = await wallet.execute([balancer.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogLiquidityAdd", {
      tokenA: DAI_ADDRESS,
      amount: toWei(1000),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await bpt.balanceOf(wallet.address);
    assert(balance > 0);
  });

  it("should remove ETH/DAI liquidity from balancer", async function () {
    const initial = await weth.balanceOf(wallet.address);

    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "removeLiquidity",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "poolAddress",
          },
          {
            type: "address",
            name: "tokenOut",
          },
          {
            type: "uint256",
            name: "poolAmtIn",
          },
        ],
      },
      [BPT, WETH_ADDRESS, MAX_UINT256]
    );

    const tx = await wallet.execute([balancer.address], [data], false, {
      from: user,
      gas: web3.utils.toHex(5e6),
    });

    expectEvent(tx, "LogLiquidityRemove", {
      tokenA: WETH_ADDRESS,
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await weth.balanceOf(wallet.address);
    assert(balance > initial);
  });
});
