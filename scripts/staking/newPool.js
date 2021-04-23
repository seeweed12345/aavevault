const fs = require("fs");
const deployments = require("../deployments.json");

// === ARTIFACTS ===
const ETHAToken = artifacts.require("ETHAToken");
const StakingRewardsFactory = artifacts.require("StakingRewardsFactory");

const toWei = (value) => web3.utils.toWei(String(value));

const { name } = hre.network;

// === DEPLOYED ===
const deployments = require("../deployments.json");
const STAKING_FACTORY = deployments[name].StakingRewardsFactory.address;

// === PARAMS ===
const ETH_DAI_LP_UNI = "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11";

const REWARD_AMOUNT = toWei("1000");
const REWARDS_DURATION = 60 * 60 * 24 * 90; // 3 Months

let data = deployments[hre.network.name];

async function main() {
  const factory = await StakingRewardsFactory.at(STAKING_FACTORY);
  const ethaToken = await ETHAToken.at(ETHA_ADDRESS);

  console.log("\nDeploying new staking pool...");
  await factory.deploy(ETH_DAI_LP_UNI, REWARD_AMOUNT, REWARDS_DURATION);
  let deployed = await factory.stakingRewardsInfoByStakingToken(ETH_DAI_LP_UNI);
  data["ETH-DAI UNI"] = deployed.stakingRewards;
  console.log("\tETH_DAI Uni Staking:", deployed.stakingRewards);

  console.log("\nSending ETHA Rewards to Factory...");
  await ethaToken.transfer(factory.address, TOTAL_REWARDS, { from: HOLDER });

  console.log("\nNotifying Rewards in Factory...");
  await factory.notifyRewardAmounts();

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
