const { time } = require("@openzeppelin/test-helpers");
const fs = require("fs");
const deployments = require("../../deployments.json");

const StakingRewardsFactory = artifacts.require("StakingRewardsFactory");

const toWei = (value) => web3.utils.toWei(String(value));

const ETHA_ETH_LP_UNI = "0xd006f2de9423090359ab04d5858a981161ce9062";
const ETHA_USDC_LP_UNI = "0xc6136ee4c911ed6b1cccaeee9065854435c0b5e0";
const ETHA_USDC_LP_BAL = "0x7B7499Fab431DeE48174f8A775E799DD1542f487";
const ETHA_ADDRESS = "0x59E9261255644c411AfDd00bD89162d09D862e38";

const REWARD_AMOUNT = toWei("90000");
const REWARDS_DURATION = 60 * 60 * 24 * 90; // 3 Months

let data = deployments[hre.network.name];

async function main() {
  const currentTime = await time.latest();
  const genesis = Number(currentTime) + 60;

  console.log("\nDeploying Staking Factory...");
  const factory = await StakingRewardsFactory.new(ETHA_ADDRESS, genesis);
  data["StakingRewardsFactory"] = factory.address;
  console.log("\tFactory Deployed:", factory.address);

  console.log("\nDeploying Staking Rewards...");
  await factory.deploy(ETHA_ETH_LP_UNI, REWARD_AMOUNT, REWARDS_DURATION);
  let deployed = await factory.stakingRewardsInfoByStakingToken(
    ETHA_ETH_LP_UNI
  );
  data["ETHA-ETH UNI"] = deployed.stakingRewards;
  console.log("\tETHA_ETH Uni Staking:", deployed.stakingRewards);

  await factory.deploy(ETHA_USDC_LP_UNI, REWARD_AMOUNT, REWARDS_DURATION);
  deployed = await factory.stakingRewardsInfoByStakingToken(ETHA_USDC_LP_UNI);
  data["ETHA-USDC UNI"] = deployed.stakingRewards;
  console.log("\tETHA_USDC Uni Staking:", deployed.stakingRewards);

  await factory.deploy(ETHA_USDC_LP_BAL, REWARD_AMOUNT, REWARDS_DURATION);
  deployed = await factory.stakingRewardsInfoByStakingToken(ETHA_USDC_LP_BAL);
  data["ETHA-USDC BAL"] = deployed.stakingRewards;
  console.log("\tETHA_USDC Bal Staking:", deployed.stakingRewards);

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
