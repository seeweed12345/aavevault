const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const TransferLogic = artifacts.require("TransferLogic");
const UniswapLogic = artifacts.require("UniswapLogic");
const InverseLogic = artifacts.require("InverseLogic");
const Vault = artifacts.require("Vault");
const YTokenStrat = artifacts.require("YTokenStrat");
const IERC20 = artifacts.require(
  "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20"
);

const {
  time,
  constants: { MAX_UINT256 },
} = require("@openzeppelin/test-helpers");
const { BN } = require("@openzeppelin/test-helpers/src/setup");
const { assert } = require("hardhat");

const hre = require("hardhat");

const FEE = 1000;
const USER = "0x01Ec5e7e03e2835bB2d1aE8D2edDEd298780129c";
const USER2 = "0xC2C5A77d9f434F424Df3d39de9e90d95A0Df5Aca";
const MULTISIG = "0x9Fd332a4e9C7F2f0dbA90745c1324Cc170D16fE4";

// TOKENS
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const YDAI_ADDRESS = "0x19D3364A399d251E894aC732651be8B0E4e85001";

// HELPERS
const toWei = (value) => web3.utils.toWei(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));

contract("Inverse Vaults", () => {
  let registry, wallet, wallet2, transfers, strat, uniswap, vault, inverse;

  before(async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USER],
    });

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USER2],
    });

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [MULTISIG],
    });

    dai = await IERC20.at(DAI_ADDRESS);

    const EthaRegistry = await ethers.getContractFactory("EthaRegistry");

    transfers = await TransferLogic.new();
    uniswap = await UniswapLogic.new();
    inverse = await InverseLogic.new();
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
      inverse.address,
    ]);

    // Smart Wallet Creation
    await registry.deployWallet({ from: USER });
    const swAddress = await registry.wallets(USER);
    wallet = await SmartWallet.at(swAddress);

    await registry.deployWallet({ from: USER2 });
    const swAddress2 = await registry.wallets(USER2);
    wallet2 = await SmartWallet.at(swAddress2);

    // Deposit DAI
    await dai.transfer(swAddress, toWei(200), { from: USER });
    await dai.transfer(swAddress2, toWei(200), { from: USER2 });

    // Fund Mulsitig with ETH
    await web3.eth.sendTransaction({
      from: USER,
      to: MULTISIG,
      value: toWei(0.5),
    });
  });

  it("should deploy the vault contract", async function () {
    vault = await Vault.new(
      DAI_ADDRESS,
      WETH_ADDRESS,
      MULTISIG,
      "Test DAI to ETH Vault",
      "testDAI>ETH"
    );
    console.log(vault.address);
  });

  it("should deploy the YTokenStrat contract", async function () {
    strat = await YTokenStrat.new(vault.address, YDAI_ADDRESS);
  });

  it("Should connect Strat to Vault", async function () {
    await vault.setStrat(strat.address, false);
    assert.equal(await vault.strat(), strat.address);
    assert.equal(await vault.paused(), false);
  });

  it("Should deposit DAI to vault", async function () {
    await strat.totalYearnDeposits();

    const daiBalance = await dai.balanceOf(wallet.address);
    assert.equal(daiBalance, toWei(200));

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
            name: "tokenAmt",
          },
          {
            type: "address",
            name: "vault",
          },
        ],
      },
      [DAI_ADDRESS, String(50e18), vault.address]
    );

    const tx = await wallet.execute([inverse.address], [data], false, {
      from: USER,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const vaultTokenBalance = await vault.balanceOf(wallet.address);
    assert(fromWei(vaultTokenBalance) > 0);
  });

  it("Should deposit DAI to vault starting with ETH", async function () {
    await strat.totalYearnDeposits();

    const data1 = web3.eth.abi.encodeFunctionCall(
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

    const data2 = web3.eth.abi.encodeFunctionCall(
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
            name: "tokenAmt",
          },
          {
            type: "address",
            name: "vault",
          },
        ],
      },
      [DAI_ADDRESS, String(50e18), vault.address]
    );

    const tx = await wallet.execute(
      [uniswap.address, inverse.address],
      [data1, data2],
      false,
      {
        from: USER,
        gas: web3.utils.toHex(5e6),
        value: toWei(1),
      }
    );

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const vaultTokenBalance = await vault.balanceOf(wallet.address);
    assert(fromWei(vaultTokenBalance) > 0);
  });

  it("Should deposit DAI to vault using waiting functionality", async function () {
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "depositAndWait",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "erc20",
          },
          {
            type: "uint256",
            name: "tokenAmt",
          },
          {
            type: "address",
            name: "vault",
          },
        ],
      },
      [DAI_ADDRESS, String(50e18), vault.address]
    );

    let tx = await wallet.execute([inverse.address], [data], false, {
      from: USER,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    tx = await wallet2.execute([inverse.address], [data], false, {
      from: USER2,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);
  });

  it("Should mint pending vault tokens (waiting)", async function () {
    const initialBalance = await vault.balanceOf(wallet.address);
    const initialBalance2 = await vault.balanceOf(wallet2.address);

    const tx = await vault.mintPending({
      from: USER2,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const finalBalance = await vault.balanceOf(wallet.address);
    const finalBalance2 = await vault.balanceOf(wallet2.address);

    assert(fromWei(finalBalance) > fromWei(initialBalance));
    assert(fromWei(finalBalance2) > fromWei(initialBalance2));
  });

  it("Should withdraw DAI from vault", async function () {
    const startDaiBalance = await dai.balanceOf(wallet.address);

    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "withdraw",
        type: "function",
        inputs: [
          {
            type: "uint256",
            name: "tokenAmt",
          },
          {
            type: "address",
            name: "vault",
          },
        ],
      },
      [String(50e18), vault.address]
    );

    const tx = await wallet.execute([inverse.address], [data], false, {
      from: USER,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const endDaiBalance = await dai.balanceOf(wallet.address);
    assert.equal(
      new BN(endDaiBalance).sub(new BN(startDaiBalance)),
      String(50e18)
    );

    // const vaultTokenBalance = await vault.balanceOf(wallet.address);
    // console.log(String(50e18));
  });

  it("Should harvest profits into ETH", async function () {
    await time.advanceBlock();

    await vault.harvest(10, { from: MULTISIG }); // onlyHarvester
  });

  it.skip("Should claim ETH profits from vault", async function () {
    const startETHBalance = await web3.eth.getBalance(wallet.address);

    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "claim",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "vault",
          },
        ],
      },
      [vault.address]
    );

    const tx = await wallet.execute([inverse.address], [data], false, {
      from: USER,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const endETHBalance = await web3.eth.getBalance(wallet.address);
    assert(new BN(endETHBalance).sub(new BN(startETHBalance)) > 0);
  });
});
