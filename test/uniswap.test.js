const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const IWallet = artifacts.require("IWallet");
const UniswapLogic = artifacts.require("UniswapLogic");
const IERC20 = artifacts.require(
  "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20"
);

const {
  expectEvent,
  constants: { MAX_UINT256 },
} = require("@openzeppelin/test-helpers");
const { assert } = require("hardhat");

const FEE = 1000;

// TOKENS
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

// HELPERS
const toWei = (value) => web3.utils.toWei(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));

contract("Uniswap Logic", ([multisig, alice]) => {
  let registry, wallet, uniswap, soloMargin;

  before(async function () {
    dai = await IERC20.at(DAI_ADDRESS);

    const EthaRegistry = await ethers.getContractFactory("EthaRegistry");

    uniswap = await UniswapLogic.new();
    uniEncode = new web3.eth.Contract(UniswapLogic.abi, uniswap.address);
    smartWalletImpl = await SmartWallet.new();

    const proxy = await upgrades.deployProxy(EthaRegistry, [
      smartWalletImpl.address,
      multisig,
      multisig,
      FEE,
    ]);

    registry = await EthaRegistryTruffle.at(proxy.address);

    await registry.enableLogicMultiple([uniswap.address]);

    await registry.deployWallet({ from: alice });
    const swAddress = await registry.wallets(alice);
    wallet = await IWallet.at(swAddress);
  });

  it("should swap ETH for DAI", async function () {
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "swapV2",
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
        ],
      },
      [ETH_ADDRESS, DAI_ADDRESS, toWei(1)]
    );

    const tx = await wallet.execute([uniswap.address], [data], false, {
      from: alice,
      gas: web3.utils.toHex(5e6),
      value: toWei(1),
    });

    expectEvent(tx, "LogSwap", {
      src: ETH_ADDRESS,
      dest: DAI_ADDRESS,
      amount: toWei(1),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);
  });

  it("should swap ETH for DAI using encodeABI", async function () {
    const data = await uniEncode.methods
      .swapV2(ETH_ADDRESS, DAI_ADDRESS, toWei(1))
      .encodeABI();

    const tx = await wallet.execute([uniswap.address], [data], false, {
      from: alice,
      gas: web3.utils.toHex(5e6),
      value: toWei(1),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);
  });
});
