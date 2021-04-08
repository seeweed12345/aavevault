// === ARTIFACTS ===
const Vault = artifacts.require("Vault");
const Harvester = artifacts.require("Harvester");
const YTokenStrat = artifacts.require("YTokenStrat");
const IYToken = artifacts.require("IYToken");
const IYStrat = artifacts.require("IYStrat");const DistributionFactory = artifacts.require("DistributionFactory");
const DistributionRewards = artifacts.require("DistributionRewards");
const etha = "0x59E9261255644c411AfDd00bD89162d09D862e38";
const genesis = 1617924986; //Reward Distribution start time

const toWei = (value) => web3.utils.toWei(String(value));

// === PARAMS ===
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const UNI_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

const YUSDC_ADDRESS = "0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9";
const YDAI_ADDRESS = "0x19D3364A399d251E894aC732651be8B0E4e85001";
const YETH_ADDRESS = "0xa9fE4601811213c340e850ea305481afF02f5b28";

const rewardAmount = toWei("90000");
const rewardsDuration = 60*60*24*90; // 3 Months


async function main() {

  const factory = await DistributionFactory.new(etha, genesis);
  console.log("Factory Deployed:", factory.address);


  const harvester = await Harvester.new();
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
  console.log("\tETHA yDAI Vault:", vault1.address);
  const strat1 = await YTokenStrat.new(vault1.address, YDAI_ADDRESS);
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
  console.log("\tETHA yUSDC Vault:", vault2.address);
  const strat2 = await YTokenStrat.new(vault2.address, YUSDC_ADDRESS);
  console.log("\tStrategy #2:", strat2.address);
  await vault2.setStrat(strat2.address, false);
  assert.equal(await vault2.strat(), strat2.address);
  assert.equal(await vault2.paused(), false);

  // === VAULT 3 ===
  console.log("\nDeploying Vault 3 ...");
  const vault3 = await Vault.new(
    WETH_ADDRESS,
    UNI_ADDRESS,
    harvester.address,
    "ETHA ETH/UNI Vault",
    "eVault"
  );
  console.log("\tETHA yETH Vault:", vault3.address);
  const strat3 = await YTokenStrat.new(vault3.address, YETH_ADDRESS);
  console.log("\tStrategy #3:", strat3.address);
  await vault3.setStrat(strat3.address, false);
  assert.equal(await vault3.strat(), strat3.address);
  assert.equal(await vault3.paused(), false);


  //Set distribution
  await factory.deploy(USDC_ADDRESS, rewardAmount, rewardsDuration, vault1.address);
  console.log('deployed distribution contract for USDC vault');
  await factory.deploy(DAI_ADDRESS, rewardAmount, rewardsDuration, vault2.address);
  console.log('deployed distribution contract for DAI vault');
  await factory.deploy(WETH_ADDRESS, rewardAmount, rewardsDuration, vault3.address);
  console.log('deployed distribution contract for ETH vault');

  let daiDistribution = await factory.stakingRewardsInfoByStakingToken(DAI_ADDRESS);
  daiDistribution = daiDistribution.stakingRewards;
  let usdcDistribution = await factory.stakingRewardsInfoByStakingToken(USDC_ADDRESS);
  usdcDistribution = usdcDistribution.stakingRewards;
  let ethDistribution = await factory.stakingRewardsInfoByStakingToken(WETH_ADDRESS);
  ethDistribution = ethDistribution.stakingRewards;

  console.log('setting distribution for dai vault:');
  vault1.updateDistribution(daiDistribution);
  console.log('distribution updated');

  console.log('setting distribution for usdc vault:');
  vault1.updateDistribution(usdcDistribution);
  console.log('distribution updated');

  console.log('setting distribution for eth vault:');
  vault1.updateDistribution(ethDistribution);
  console.log('distribution updated');


  //Transfer ETHA and call vault's notify reward method of distribution factory after the genesis time has passed


  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
