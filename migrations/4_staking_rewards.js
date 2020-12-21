const StakingRewardsFactory = artifacts.require("StakingRewardsFactory");

const ETHA_TOKEN = "0x59E9261255644c411AfDd00bD89162d09D862e38";
const MULTI_SIG_ADDRESS = "0x9Fd332a4e9C7F2f0dbA90745c1324Cc170D16fE4";

module.exports = async function (truffle, network) {
  if (network === "development") return;

  // Factory Deployment
  await truffle.deploy(
    StakingRewardsFactory,
    ETHA_TOKEN,
    MULTI_SIG_ADDRESS,
    Math.floor(Date.now() / 1000) + 10
  );
};
