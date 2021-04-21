const deployments = require("../../deployments.json");

const DistributionFactory = artifacts.require("DistributionFactory");
const ETHAToken = artifacts.require("ETHAToken");

const toWei = (value) => web3.utils.toWei(String(value));

const ETHA_ADDRESS = "0x59E9261255644c411AfDd00bD89162d09D862e38";
const HOLDER = "0x9Fd332a4e9C7F2f0dbA90745c1324Cc170D16fE4";

const TOTAL_REWARDS = toWei("270000"); // 3x 90k

async function main() {
  // Fund ETHA Holder
  const [user1] = await web3.eth.getAccounts();
  await web3.eth.sendTransaction({ from: user1, to: HOLDER, value: toWei(1) });

  const factory = await DistributionFactory.at(
    deployments[hre.network.name]["DistributionFactory"]
  );
  const ethaToken = await ETHAToken.at(ETHA_ADDRESS);

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
