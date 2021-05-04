const Investments = artifacts.require("Investments");
const Balances = artifacts.require("Balances");

async function main() {
  console.log("Deploying Investments Adapter...");
  const investments = await Investments.new();
  console.log("Deployed:", investments.address);
  Investments.setAsDeployed(investments);

  console.log("Deploying Balances Adapter...");
  const balances = await Balances.new();
  console.log("Deployed:", balances.address);
  Balances.setAsDeployed(balances);

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
