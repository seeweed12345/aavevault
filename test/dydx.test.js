const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const DyDxLogic = artifacts.require("DyDxLogic");
const ISoloMargin = artifacts.require("ISoloMargin");
const IERC20 = artifacts.require(
  "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20"
);

const {
  expectRevert,
  constants: { MAX_UINT256 },
} = require("@openzeppelin/test-helpers");
const { assert } = require("hardhat");

const FEE = 1000;
const SOLO_MARGIN = "0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e";

// TOKENS
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

// HELPERS
const toWei = (value) => web3.utils.toWei(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));

contract("Dydx Logic", ([multisig, alice]) => {
  let registry, wallet, dydx, soloMargin;

  before(async function () {
    dai = await IERC20.at(DAI_ADDRESS);
    soloMargin = await ISoloMargin.at(SOLO_MARGIN);

    const EthaRegistry = await ethers.getContractFactory("EthaRegistry");

    dydx = await DyDxLogic.new();
    smartWalletImpl = await SmartWallet.new();

    const proxy = await upgrades.deployProxy(EthaRegistry, [
      smartWalletImpl.address,
      multisig,
      multisig,
      FEE,
    ]);

    registry = await EthaRegistryTruffle.at(proxy.address);

    await registry.enableLogicMultiple([dydx.address]);

    const tx = await registry.deployWallet({ from: alice });
    const swAddress = await registry.wallets(alice);
    wallet = await SmartWallet.at(swAddress);
  });

  it("should get correct balance for ETH", async function () {
    const { value, sign } = await soloMargin.getAccountWei(
      [wallet.address, 0],
      0
    );
    assert(value, 0);
    assert(!sign); // sign is false when 0 or negative (borrowed funds)
  });

  it("should invest ETH", async function () {
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "deposit",
        type: "function",
        inputs: [
          {
            type: "uint256",
            name: "marketId",
          },
          {
            type: "address",
            name: "erc20Addr",
          },
          {
            type: "uint256",
            name: "tokenAmt",
          },
        ],
      },
      [0, ETH_ADDRESS, toWei(0.1)]
    );

    const tx = await wallet.execute([dydx.address], [data], false, {
      from: alice,
      gas: web3.utils.toHex(5e6),
      value: toWei(0.1),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const { value, sign } = await soloMargin.getAccountWei(
      [wallet.address, 0],
      0
    );
    assert(fromWei(value), 0.1);
    assert(sign);
  });

  it("should not be able to withdraw ETH using the borrow function", async function () {
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "borrow",
        type: "function",
        inputs: [
          {
            type: "uint256",
            name: "marketId",
          },
          {
            type: "address",
            name: "erc20Addr",
          },
          {
            type: "uint256",
            name: "tokenAmt",
          },
        ],
      },
      [0, WETH_ADDRESS, toWei(0.05)]
    );

    await expectRevert(
      wallet.execute([dydx.address], [data], false, {
        from: alice,
        gas: web3.utils.toHex(5e6),
      }),
      "withdraw first"
    );
  });

  it("should withdraw ETH", async function () {
    const initialETH = await web3.eth.getBalance(wallet.address);

    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "withdraw",
        type: "function",
        inputs: [
          {
            type: "uint256",
            name: "marketId",
          },
          {
            type: "address",
            name: "erc20Addr",
          },
          {
            type: "uint256",
            name: "tokenAmt",
          },
        ],
      },
      [0, WETH_ADDRESS, toWei(0.02)]
    );

    const tx = await wallet.execute([dydx.address], [data], false, {
      from: alice,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const { value, sign } = await soloMargin.getAccountWei(
      [wallet.address, 0],
      0
    );
    assert(fromWei(value), 0.08);
    assert(sign);

    const finalETH = await web3.eth.getBalance(wallet.address);

    assert.equal(fromWei(finalETH) - fromWei(initialETH), 0.02 * 0.99); // 0.02 - 1% fee
  });

  it("should borrow DAI", async function () {
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "borrow",
        type: "function",
        inputs: [
          {
            type: "uint256",
            name: "marketId",
          },
          {
            type: "address",
            name: "erc20Addr",
          },
          {
            type: "uint256",
            name: "tokenAmt",
          },
        ],
      },
      [3, DAI_ADDRESS, toWei(10)]
    );

    const tx = await wallet.execute([dydx.address], [data], false, {
      from: alice,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const { value, sign } = await soloMargin.getAccountWei(
      [wallet.address, 0],
      3
    );
    assert(fromWei(value), 10);
    assert(!sign); // negative balance

    const daiBalance = await dai.balanceOf(wallet.address);
    assert.equal(fromWei(daiBalance), 10);
  });

  it("should borrow more DAI", async function () {
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "borrow",
        type: "function",
        inputs: [
          {
            type: "uint256",
            name: "marketId",
          },
          {
            type: "address",
            name: "erc20Addr",
          },
          {
            type: "uint256",
            name: "tokenAmt",
          },
        ],
      },
      [3, DAI_ADDRESS, toWei(10)]
    );

    const tx = await wallet.execute([dydx.address], [data], false, {
      from: alice,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const { value, sign } = await soloMargin.getAccountWei(
      [wallet.address, 0],
      3
    );
    assert(fromWei(value), 20);
    assert(!sign); // negative balance

    const daiBalance = await dai.balanceOf(wallet.address);
    assert.equal(fromWei(daiBalance), 20);
  });

  it("should repay all DAI", async function () {
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "payback",
        type: "function",
        inputs: [
          {
            type: "uint256",
            name: "marketId",
          },
          {
            type: "address",
            name: "erc20Addr",
          },
          {
            type: "uint256",
            name: "tokenAmt",
          },
        ],
      },
      [3, DAI_ADDRESS, toWei(20)]
    );

    const tx = await wallet.execute([dydx.address], [data], false, {
      from: alice,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const { value, sign } = await soloMargin.getAccountWei(
      [wallet.address, 0],
      3
    );
    assert(fromWei(value), 0);
    assert(!sign); // sign is false when 0 or negative

    const daiBalance = await dai.balanceOf(wallet.address);
    assert.equal(fromWei(daiBalance), 0);
  });
});
