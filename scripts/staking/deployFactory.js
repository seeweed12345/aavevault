const StakingRewardsFactory = artifacts.require("StakingRewardsFactory");
const etha = "0x59E9261255644c411AfDd00bD89162d09D862e38";
const genesis = 1617710194;

const toWei = (value) => web3.utils.toWei(String(value));

const ETHA_ETH_UNI_LP = "0xd006f2de9423090359ab04d5858a981161ce9062";
const ETHA_USDC_BALANCER_LP = "0x7B7499Fab431DeE48174f8A775E799DD1542f487";
const ETHA_USDC_UNI_LP = "0xc6136ee4c911ed6b1cccaeee9065854435c0b5e0";

const rewardAmount = toWei("90000");
const rewardsDuration = 60*60*24*90; // 3 Months


async function main() {

  const factory = await StakingRewardsFactory.new(etha, genesis);
  console.log("Factory Deployed:", factory.address);
  await factory.deploy(ETHA_ETH_UNI_LP, rewardAmount, rewardsDuration);
  console.log('deployed staking contract for ETHA_ETH_UNI_LP');
  await factory.deploy(ETHA_USDC_BALANCER_LP, rewardAmount, rewardsDuration);
  console.log('deployed staking contract for ETHA_USDC_BALANCER_LP');
  await factory.deploy(ETHA_USDC_UNI_LP, rewardAmount, rewardsDuration);
  console.log('deployed staking contract for ETHA_USDC_UNI_LP');
  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
