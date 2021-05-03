const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const UniswapLogic = artifacts.require("UniswapLogic");
const AaveLogic = artifacts.require("AaveLogic");
const TransferLogic = artifacts.require("TransferLogic");
const DyDxLogic = artifacts.require("DyDxLogic");
const CompoundLogic = artifacts.require("CompoundLogic");
const ISoloMargin = artifacts.require("ISoloMargin");
const IERC20 = artifacts.require(
  "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20"
);
const DistributionFactory = artifacts.require("LendingDistributionFactory");
const DistributionRewards = artifacts.require("LendingDistributionRewards");

const {
  expectRevert,
  expectEvent,
  time,
  balance: ozBalance,
  constants: { MAX_UINT256 },
} = require("@openzeppelin/test-helpers");

const { assertion } = require("@openzeppelin/test-helpers/src/expectRevert");
const { assert } = require("hardhat");
const hre = require("hardhat");

// HELPERS
const toWei = (value) => web3.utils.toWei(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));

const FEE = 1000;
const REWARD_AMOUNT = toWei("1000");
const REWARD_DURATION = 86400; //1 DAY
const USER = "0xdd79dc5b781b14ff091686961adc5d47e434f4b0";
const CHI_HOLDER = "0x4f89e886B7281DB8DED9B604cEcE932063dFdCdc";
const MULTISIG = "0x9Fd332a4e9C7F2f0dbA90745c1324Cc170D16fE4";
const SOLO_MARGIN = "0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e";
const ETHA_HOLDER = "0xa1CEc90603405dA9578c88cDc8cAe7e098532DEa";

// TOKENS
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const ADAI_ADDRESS = "0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d";
const CDAI_ADDRESS = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
const CHI_ADDRESS = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c";
const ETHA_ADDRESS = "0x59E9261255644c411AfDd00bD89162d09D862e38";

contract("Smart Wallet", ([delegate, random]) => {
  let registry,
    wallet,
    transfers,
    compound,
    aave,
    dydx,
    uniswap,
    chi,
    etha,
    distributionFactory,
    daiDistribution,
    genesis;

  before(async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USER],
    });

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [CHI_HOLDER],
    });

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ETHA_HOLDER],
    });

    dai = await IERC20.at(DAI_ADDRESS);
    chi = await IERC20.at(CHI_ADDRESS);

    // Fix fork time
    const currentTime = Math.floor(Date.now() / 1000);
    await time.increaseTo(currentTime);

    genesis = Number(await time.latest()) + 15;

    etha = await IERC20.at(ETHA_ADDRESS);

    await chi.transfer(USER, 200, { from: CHI_HOLDER });

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

    distributionFactory = await DistributionFactory.new(
      ETHA_ADDRESS,
      genesis,
      proxy.address
    );

    await distributionFactory.deploy(
      DAI_ADDRESS,
      REWARD_AMOUNT,
      REWARD_DURATION
    );

    daiDistribution = await distributionFactory.stakingRewardsInfoByStakingToken(
      DAI_ADDRESS
    );

    await etha.transfer(distributionFactory.address, REWARD_AMOUNT, {
      from: ETHA_HOLDER,
    });

    await time.increase(50);

    await distributionFactory.notifyRewardAmounts();

    await registry.enableLogicMultiple([
      transfers.address,
      uniswap.address,
      aave.address,
      compound.address,
      dydx.address,
    ]);

    await registry.setDistribution(DAI_ADDRESS, daiDistribution.stakingRewards);
  });

  it("should only allow etha wallets to stake/withdraw", async function () {
    let distribution = await DistributionRewards.at(
      daiDistribution.stakingRewards
    );
    await expectRevert(
      distribution.stake(toWei("1000"), { from: USER }),
      "Invalid Access: Can only be accessed by ETHA wallets"
    );
    await expectRevert(
      distribution.withdraw(toWei("1000"), { from: USER }),
      "Invalid Access: Can only be accessed by ETHA wallets"
    );
  });

  it("should deploy a smart wallet", async function () {
    const tx = await registry.deployWallet({ from: USER });
    const swAddress = await registry.wallets(USER);
    wallet = await SmartWallet.at(swAddress);
    console.log("\tUSER SW:", swAddress);
    console.log("\tGas Used:", tx.receipt.gasUsed);

    await chi.approve(swAddress, MAX_UINT256, { from: USER });
  });

  it.skip("should fund user with CHI and approve SW", async function () {
    await chi.transfer(USER, 200, { from: CHI_HOLDER });
    await chi.approve(wallet.address, MAX_UINT256, { from: USER });
  });

  it("only wallet owner can add a delegate", async function () {
    await expectRevert(
      wallet.addDelegate(delegate, { from: random }),
      "ONLY-OWNER"
    );
    const tx = await wallet.addDelegate(delegate, { from: USER });
    console.log("\tGas Used:", tx.receipt.gasUsed);

    expectEvent(tx, "DelegateAdded", { delegate });

    const isDelegate = await wallet.isDelegate(delegate);

    assert(isDelegate);
  });

  it("should deposit DAI to the smart wallet", async function () {
    await dai.approve(wallet.address, MAX_UINT256, {
      from: USER,
    });
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
      [DAI_ADDRESS, toWei(500)]
    );

    const tx = await wallet.execute([transfers.address], [data], false, {
      from: USER,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await dai.balanceOf(wallet.address);
    assert.equal(balance, toWei(500));
  });

  it("should invest DAI to Aave Protocol", async function () {
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "mintAToken",
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
        ],
      },
      [DAI_ADDRESS, String(50e18)]
    );

    const tx = await wallet.execute([aave.address], [data], false, {
      from: USER,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const aDaiContract = await IERC20.at(ADAI_ADDRESS);
    const invested = await aDaiContract.balanceOf(wallet.address);
    assert.equal(invested, String(50e18));

    let distribution = await DistributionRewards.at(
      daiDistribution.stakingRewards
    );
    let stakedBalance = await distribution.balanceOf(wallet.address);
    assert.equal(stakedBalance, String(50e18));
  });

  it("should invest DAI to Aave Protocol burning CHI tokens", async function () {
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "mintAToken",
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
        ],
      },
      [DAI_ADDRESS, String(50e18)]
    );

    const tx = await wallet.execute([aave.address], [data], true, {
      from: USER,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const aDaiContract = await IERC20.at(ADAI_ADDRESS);
    const invested = await aDaiContract.balanceOf(wallet.address);
    assert(fromWei(invested) > 100); // 50 + 50 + interest earned

    let distribution = await DistributionRewards.at(
      daiDistribution.stakingRewards
    );
    let stakedBalance = await distribution.balanceOf(wallet.address);
    assert(stakedBalance == 100e18); //50+50;
    await time.increase(3600);
    //ETHA earned after 1 hour
    let earnedETHA = await distribution.earned(wallet.address);

    console.log(
      "deposited",
      fromWei(stakedBalance),
      "\n",
      "earned after 1 hour",
      fromWei(earnedETHA)
    );

    await distribution.getReward(wallet.address);
    let userEthaBalance = await etha.balanceOf(wallet.address);
    console.log(
      "User ETHA balance after claiming reward",
      fromWei(userEthaBalance)
    );
  });

  it("should invest DAI to Compound Protocol", async function () {
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "mintCToken",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "erc20",
          },
          {
            type: "address",
            name: "cErc20",
          },
          {
            type: "uint256",
            name: "tokenAmt",
          },
        ],
      },
      [DAI_ADDRESS, CDAI_ADDRESS, String(50e18)]
    );

    const tx = await wallet.execute([compound.address], [data], false, {
      from: USER,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const cDaiContract = await IERC20.at(CDAI_ADDRESS);
    const invested = await cDaiContract.balanceOf(wallet.address);
    assert(fromWei(invested) > 0);

    let distribution = await DistributionRewards.at(
      daiDistribution.stakingRewards
    );
    let stakedBalance = await distribution.balanceOf(wallet.address);
    assert(stakedBalance == 150e18); //50+50 + 50;
    await time.increase(3600);
    //ETHA earned after 1 hour
    let earnedETHA = await distribution.earned(wallet.address);

    console.log(
      "deposited",
      fromWei(stakedBalance),
      "\n",
      "earned after 1 hour",
      fromWei(earnedETHA)
    );

    await distribution.getReward(wallet.address);
    let userEthaBalance = await etha.balanceOf(wallet.address);
    console.log(
      "User ETHA balance after claiming reward",
      fromWei(userEthaBalance)
    );
  });

  it("should invest DAI to DyDx Protocol", async function () {
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
      [3, DAI_ADDRESS, String(50e18)]
    );

    const tx = await wallet.execute([dydx.address], [data], false, {
      from: USER,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const soloMargin = await ISoloMargin.at(SOLO_MARGIN);
    let { value } = await soloMargin.getAccountWei([wallet.address, 0], 3);
    assert(fromWei(value), 50); // balance just after invested is 49.9999999999

    let distribution = await DistributionRewards.at(
      daiDistribution.stakingRewards
    );
    let stakedBalance = await distribution.balanceOf(wallet.address);
    assert(stakedBalance == 200e18); //50+50+50+50;
    await time.increase(3600);

    let earnedETHA = await distribution.earned(wallet.address);

    console.log(
      "deposited",
      fromWei(stakedBalance),
      "\n",
      "earned after 1 hour",
      fromWei(earnedETHA)
    );

    await distribution.getReward(wallet.address);
    let userEthaBalance = await etha.balanceOf(wallet.address);
    console.log(
      "User ETHA balance after claiming reward",
      fromWei(userEthaBalance)
    );
  });

  it("should swap all remaining DAI to ETH using Uniswap", async function () {
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
      [DAI_ADDRESS, ETH_ADDRESS, MAX_UINT256]
    );

    const tx = await wallet.execute([uniswap.address], [data], false, {
      from: USER,
      gas: web3.utils.toHex(5e6),
    });

    console.log("\tGas Used:", tx.receipt.gasUsed);

    const balance = await dai.balanceOf(wallet.address);
    assert.equal(balance, 0);

    const balanceEth = await web3.eth.getBalance(wallet.address);
    assert(fromWei(balanceEth) > 0);
  });

  it("should withdraw DAI from Compound Protocol", async function () {
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "redeemUnderlying",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "erc20",
          },
          {
            type: "address",
            name: "cErc20",
          },
          {
            type: "uint256",
            name: "tokenAmt",
          },
        ],
      },
      [DAI_ADDRESS, CDAI_ADDRESS, String(50e18)]
    );

    const tx = await wallet.execute([compound.address], [data], false, {
      from: USER,
      gas: web3.utils.toHex(5e6),
    });

    let distribution = await DistributionRewards.at(
      daiDistribution.stakingRewards
    );
    let stakedBalance = await distribution.balanceOf(wallet.address);
    assert(stakedBalance == 150e18); //50+50+50+50 - 50;
  });
});
