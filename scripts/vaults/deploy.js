const { time } = require("@openzeppelin/test-helpers");
const fs = require("fs");
const deployments = require("../../deployments.json");

// === ARTIFACTS ===
const Vault = artifacts.require("Vault");
const Harvester = artifacts.require("Harvester");
const YTokenStrat = artifacts.require("YTokenStrat");
const DistributionFactory = artifacts.require("DistributionFactory");

// const genesis = 1617924986; //Reward Distribution start time

const toWei = (value) => web3.utils.toWei(String(value));

// === PARAMS ===
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const LINK_ADDRESS = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
const ETHA_ADDRESS = "0x59E9261255644c411AfDd00bD89162d09D862e38";

// === YEARN VAULTS AVAILABLE ===
const YUSDC_ADDRESS = "0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9";
const YDAI_ADDRESS = "0x19D3364A399d251E894aC732651be8B0E4e85001";
const YETH_ADDRESS = "0xa9fE4601811213c340e850ea305481afF02f5b28";

const REWARD_AMOUNT = toWei("90000");
const REWARDS_DURATION = 60 * 60 * 24 * 90; // 3 Months

let data = deployments[hre.network.name];

async function main() {
  const currentTime = await time.latest();
  const genesis = Number(currentTime) + REWARDS_DURATION;

  const factory = await DistributionFactory.new(ETHA_ADDRESS, genesis);
  data["DistributionFactory"] = factory.address;
  console.log("\n\n\tDistribution Factory:", factory.address);

  const harvester = await Harvester.new();
  data["Harvester"] = harvester.address;
  console.log("\tHarvester:", harvester.address);

  // === VAULT 1 ===
  console.log("\nDeploying Vault 1 ...");
  const vault1 = await Vault.new(
    DAI_ADDRESS,
    WETH_ADDRESS,
    harvester.address,
    "ETHA DAI/ETH Vault",
    "eVault"
  );
  data["Vault1"] = vault1.address;
  console.log("\tETHA yDAI Vault:", vault1.address);
  const strat1 = await YTokenStrat.new(vault1.address, YDAI_ADDRESS);
  data["Strat1"] = strat1.address;
  console.log("\tStrategy #1:", strat1.address);
  await vault1.setStrat(strat1.address, false);
  assert.equal(await vault1.strat(), strat1.address);
  assert.equal(await vault1.paused(), false);

  // === VAULT 2 ===
  console.log("\nDeploying Vault 2 ...");
  const vault2 = await Vault.new(
    USDC_ADDRESS,
    WETH_ADDRESS,
    harvester.address,
    "ETHA USDC/ETH Vault",
    "eVault"
  );
  data["Vault2"] = vault2.address;
  console.log("\tETHA yUSDC Vault:", vault2.address);
  const strat2 = await YTokenStrat.new(vault2.address, YUSDC_ADDRESS);
  data["Strat2"] = strat2.address;
  console.log("\tStrategy #2:", strat2.address);
  await vault2.setStrat(strat2.address, false);
  assert.equal(await vault2.strat(), strat2.address);
  assert.equal(await vault2.paused(), false);

  // === VAULT 3 ===
  console.log("\nDeploying Vault 3 ...");
  const vault3 = await Vault.new(
    WETH_ADDRESS,
    LINK_ADDRESS,
    harvester.address,
    "ETHA ETH/LINK Vault",
    "eVault"
  );
  data["Vault3"] = vault3.address;
  console.log("\tETHA yETH Vault:", vault3.address);
  const strat3 = await YTokenStrat.new(vault3.address, YETH_ADDRESS);
  data["Strat3"] = strat3.address;
  console.log("\tStrategy #3:", strat3.address);
  await vault3.setStrat(strat3.address, false);
  assert.equal(await vault3.strat(), strat3.address);
  assert.equal(await vault3.paused(), false);

  //Staking Distribution Contracts
  console.log("\nDeploying distribution contracts");
  await factory.deploy(
    USDC_ADDRESS,
    REWARD_AMOUNT,
    REWARDS_DURATION,
    vault1.address
  );
  await factory.deploy(
    DAI_ADDRESS,
    REWARD_AMOUNT,
    REWARDS_DURATION,
    vault2.address
  );
  await factory.deploy(
    WETH_ADDRESS,
    REWARD_AMOUNT,
    REWARDS_DURATION,
    vault3.address
  );

  console.log("\nInitializing distribution contract in vaults");
  let { stakingRewards } = await factory.stakingRewardsInfoByStakingToken(
    DAI_ADDRESS
  );
  data["Dist1"] = stakingRewards;
  await vault1.updateDistribution(stakingRewards);

  ({ stakingRewards } = await factory.stakingRewardsInfoByStakingToken(
    USDC_ADDRESS
  ));
  data["Dist2"] = stakingRewards;
  await vault2.updateDistribution(stakingRewards);

  ({ stakingRewards } = await factory.stakingRewardsInfoByStakingToken(
    WETH_ADDRESS
  ));
  data["Dist3"] = stakingRewards;
  await vault3.updateDistribution(stakingRewards);

  //Transfer ETHA and call vault's notify reward method of distribution factory after the genesis time has passed

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
