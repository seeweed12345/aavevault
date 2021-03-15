const VestingFactory = artifacts.require("VestingFactory");
const TokenVesting = artifacts.require("TokenVesting");

async function main() {
  const impl = await TokenVesting.new();
  TokenVesting.setAsDeployed(impl);
  console.log("\nVesting Implementation:", impl.address);

  const factory = await VestingFactory.new();
  VestingFactory.setAsDeployed(factory);
  console.log("Factory Deployed:", factory.address);

  console.log("Setting implementation address..");
  await factory.setImplementation(impl.address);

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
