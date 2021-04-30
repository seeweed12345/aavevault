// === ARTIFACTS ===
const Vault = artifacts.require("Vault");
const Harvester = artifacts.require("Harvester");
const YTokenStrat = artifacts.require("YTokenStrat");

const toWei = (value) => web3.utils.toWei(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));

const { name } = hre.network;

// === DEPLOYED ===
const deployments = require("../../deployments.json");
const HARVESTER = deployments[name].Harvester;
const VAULT = deployments[name]["DAIVault"];
const STRAT = deployments[name]["StratDAI"];

// === TOKENS ===
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const { time } = require("@openzeppelin/test-helpers");

const gasPrice = 50e9;

async function main() {
  const harvester = await Harvester.at(HARVESTER);
  const vault = await Vault.at(VAULT);
  const strat = await YTokenStrat.at(STRAT);

  const now = Number(await time.latest());

  const totalValue = await strat.calcTotalValue();
  const totalSupply = await vault.totalSupply();
  console.log("Available Profits:", fromWei(totalValue) - fromWei(totalSupply));

  console.log("\nHarvesting Vault ...");
  await harvester.harvestVault(
    VAULT,
    toWei(0.053),
    1,
    [DAI_ADDRESS, WETH_ADDRESS],
    now + 3600,
    { gasPrice }
  );

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
