const VestingFactory = artifacts.require("VestingFactory");
const TokenVesting = artifacts.require("TokenVesting");

async function main() {
  const impl = await TokenVesting.new();
  console.log("\nVesting Implementation:", impl.address);

  const factory = await VestingFactory.new();
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
