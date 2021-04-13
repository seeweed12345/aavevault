// === ARTIFACTS ===
const Vault = artifacts.require("Vault");
const Harvester = artifacts.require("Harvester");
const YTokenStrat = artifacts.require("YTokenStrat");
const DistributionFactory = artifacts.require("DistributionFactory");

const toWei = (value) => web3.utils.toWei(String(value));

// === DEPLOYED ===
const HARVESTER = "0xB876d4480daBaBa64c9229775695E22DD79b5D8C";
const DIST_FACTORY = "0x55B7162F06e4Cf5b2e06E5757c1e474dB8E10516";

// === PARAMS ===
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const UNI_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

// === STRATS ===
const YUSDC_ADDRESS = "0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9";
const YDAI_ADDRESS = "0x19D3364A399d251E894aC732651be8B0E4e85001";
const YETH_ADDRESS = "0xa9fE4601811213c340e850ea305481afF02f5b28";

const rewardAmount = toWei("90000");
const rewardsDuration = 60 * 60 * 24 * 90; // 3 Months

async function main() {
  const factory = await DistributionFactory.at(DIST_FACTORY);
  const harvester = await Harvester.at(HARVESTER);

  console.log("\nDeploying Vault ...");
  const vault = await Vault.new(
    DAI_ADDRESS,
    UNI_ADDRESS,
    harvester.address,
    "ETHA DAI/UNI Vault",
    "eVault"
  );
  const strat = await YTokenStrat.new(vault.address, YDAI_ADDRESS);
  await vault1.setStrat(strat.address, false);
  assert.equal(await vault.strat(), strat.address);
  assert.equal(await vault.paused(), false);

  console.log("\nSetting distribution contract ...");
  await factory.deploy(
    DAI_ADDRESS,
    rewardAmount,
    rewardsDuration,
    vault.address
  );
  const { stakingRewards } = await factory.stakingRewardsInfoByStakingToken(
    DAI_ADDRESS
  );
  await vault.updateDistribution(stakingRewards);

  //Transfer ETHA and call vault's notify reward method of distribution factory after the genesis time has passed

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
