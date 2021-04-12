const { time } = require("@openzeppelin/test-helpers");

const StakingRewardsFactory = artifacts.require("StakingRewardsFactory");

const toWei = (value) => web3.utils.toWei(String(value));

const ETHA_ETH_LP_UNI = "0xd006f2de9423090359ab04d5858a981161ce9062";
const ETHA_USDC_LP_UNI = "0xc6136ee4c911ed6b1cccaeee9065854435c0b5e0";
const ETHA_USDC_LP_BAL = "0xebdb2d0f89b0148a6b1b0520388f3ad7daff8acc";
const ETHA_ADDRESS = "0x59E9261255644c411AfDd00bD89162d09D862e38";

const REWARD_AMOUNT = toWei("90000");
const REWARDS_DURATION = 60 * 60 * 24 * 90; // 3 Months

async function main() {
  const currentTime = await time.latest();
  const genesis = Number(currentTime) + REWARDS_DURATION;

  console.log("\nDeploying Staking Factory...");
  const factory = await StakingRewardsFactory.new(ETHA_ADDRESS, genesis);
  console.log("\tFactory Deployed:", factory.address);

  console.log("\nDeploying Staking Rewards...");
  await factory.deploy(ETHA_ETH_LP_UNI, REWARD_AMOUNT, REWARDS_DURATION);
  let deployed = await factory.stakingRewardsInfoByStakingToken(
    ETHA_ETH_LP_UNI
  );
  console.log("\tETHA_ETH Uni Staking:", deployed.stakingRewards);

  await factory.deploy(ETHA_USDC_LP_UNI, REWARD_AMOUNT, REWARDS_DURATION);
  deployed = await factory.stakingRewardsInfoByStakingToken(ETHA_USDC_LP_UNI);
  console.log("\tETHA_USDC Uni Staking:", deployed.stakingRewards);

  await factory.deploy(ETHA_USDC_LP_BAL, REWARD_AMOUNT, REWARDS_DURATION);
  deployed = await factory.stakingRewardsInfoByStakingToken(ETHA_USDC_LP_BAL);
  console.log("\tETHA_USDC Bal Staking:", deployed.stakingRewards);

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
