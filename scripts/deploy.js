const fs = require("fs");
const deployments = require("../deployments.json");

// === ARTIFACTS ===

// Protocol
const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const TransferLogic = artifacts.require("TransferLogic");
const InverseLogic = artifacts.require("InverseLogic");

// Swap
const UniswapLogic = artifacts.require("UniswapLogic");
const CurveLogic = artifacts.require("CurveLogic");
const BalancerLogic = artifacts.require("BalancerLogic");

// Lending
const AaveLogic = artifacts.require("AaveLogic");
const DyDxLogic = artifacts.require("DyDxLogic");
const CompoundLogic = artifacts.require("CompoundLogic");
const DistributionFactory = artifacts.require("LendingDistributionFactory");
const DistributionRewards = artifacts.require("LendingDistributionRewards");

// HELPERS
const toWei = (value) => web3.utils.toWei(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));

// Params
const FEE = 1000;
const MULTISIG = "0x9Fd332a4e9C7F2f0dbA90745c1324Cc170D16fE4";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const ETHA_ADDRESS = "0x59E9261255644c411AfDd00bD89162d09D862e38";
const REWARD_AMOUNT = toWei("10");
const REWARDS_DURATION = 60 * 60 * 24 * 10; // 10 Days

let data = deployments[hre.network.name];

// Deployment
async function main() {
  let totalGas = 0;
  let gasUsed;

  console.log("\n\nDeploying Logics...");

  const transfers = await TransferLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(
    transfers.transactionHash
  ));
  totalGas += gasUsed;
  data["TransferLogic"] = transfers.address;
  console.log("\tTransfers Logic:", transfers.address);

  const aave = await AaveLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(aave.transactionHash));
  totalGas += gasUsed;
  data["AaveLogic"] = aave.address;
  console.log("\tAave Logic:", aave.address);

  const dydx = await DyDxLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(dydx.transactionHash));
  totalGas += gasUsed;
  data["DyDxLogic"] = dydx.address;
  console.log("\tDydx Logic:", dydx.address);

  const compound = await CompoundLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(
    compound.transactionHash
  ));
  totalGas += gasUsed;
  data["CompoundLogic"] = compound.address;
  console.log("\tCompound Logic:", compound.address);

  const uniswap = await UniswapLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(uniswap.transactionHash));
  totalGas += gasUsed;
  data["UniswapLogic"] = uniswap.address;
  console.log("\tUniswap Logic:", uniswap.address);

  const curve = await CurveLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(curve.transactionHash));
  totalGas += gasUsed;
  data["CurveLogic"] = curve.address;
  console.log("\tCurve Logic:", curve.address);

  const balancer = await BalancerLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(
    balancer.transactionHash
  ));
  totalGas += gasUsed;
  data["BalancerLogic"] = balancer.address;
  console.log("\tBalancer Logic:", balancer.address);

  const inverse = await InverseLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(inverse.transactionHash));
  totalGas += gasUsed;
  data["InverseLogic"] = inverse.address;
  console.log("\tInverseLogic:", inverse.address);

  console.log("\nDeploying Smart Wallet Implementation...");
  const smartWalletImpl = await SmartWallet.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(
    smartWalletImpl.transactionHash
  ));
  totalGas += gasUsed;
  data["SmartWallet"] = smartWalletImpl.address;
  console.log("\tImplementation:", smartWalletImpl.address);

  console.log("\nDeploying Registry...");
  const EthaRegistry = await ethers.getContractFactory("EthaRegistry");
  const proxy = await upgrades.deployProxy(EthaRegistry, [
    smartWalletImpl.address,
    MULTISIG,
    MULTISIG,
    FEE,
  ]);
  ({ gasUsed } = await web3.eth.getTransactionReceipt(
    proxy.deployTransaction.hash
  ));
  totalGas += gasUsed;
  data["EthaRegistry"] = proxy.address;
  const registry = await EthaRegistryTruffle.at(proxy.address);
  console.log("\tEtha Registry:", registry.address);

  console.log("\nEnabling logic contracts...");
  const { receipt } = await registry.enableLogicMultiple([
    transfers.address,
    inverse.address,
    uniswap.address,
    curve.address,
    balancer.address,
    aave.address,
    compound.address,
    dydx.address,
  ]);
  totalGas += receipt.gasUsed;


  //Distribution Contracts for lending Deployment
  const currentTime = await time.latest();
  const genesis = Number(currentTime) + 60;

  const factory = await DistributionFactory.new(ETHA_ADDRESS, genesis, proxy.address);

  //DAI Distribution
  await factory.deploy(
    DAI_ADDRESS,
    rewardAmount,
    rewardsDuration
  );
  let daiDistribution = await distributionFactory.stakingRewardsInfoByStakingToken(DAI_ADDRESS);
  await registry.setDistribution(
    DAI_ADDRESS,
    daiDistribution.stakingRewards
  );

  //USDC Distribution
  await factory.deploy(
    USDC_ADDRESS,
    rewardAmount,
    rewardsDuration
  );
  let usdcDistribution = await distributionFactory.stakingRewardsInfoByStakingToken(USDC_ADDRESS);
  await registry.setDistribution(
    USDC_ADDRESS,
    usdcDistribution.stakingRewards
  );
  //USDT Distribution
  await factory.deploy(
    USDT_ADDRESS,
    rewardAmount,
    rewardsDuration
  );
  let usdtDistribution = await distributionFactory.stakingRewardsInfoByStakingToken(USDT_ADDRESS);
  await registry.setDistribution(
    USDT_ADDRESS,
    usdtDistribution.stakingRewards
  );
  //ETH Distribution
  await factory.deploy(
    ETH_ADDRESS,
    rewardAmount,
    rewardsDuration
  );
  let ethDistribution = await distributionFactory.stakingRewardsInfoByStakingToken(ETH_ADDRESS);
  await registry.setDistribution(
    ETH_ADDRESS,
    ethDistribution.stakingRewards
  );

  console.log("\nTotal Gas Used:", totalGas);

  deployments[hre.network.name] = data;

  fs.writeFileSync("deployments.json", JSON.stringify(deployments));

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
