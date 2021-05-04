const fs = require("fs");
const deployments = require("../deployments.json");

// Registry
const EthaRegistryTruffle = artifacts.require("EthaRegistry");

// Swap
const EthWrapLogic = artifacts.require("EthWrapLogic");

let data = deployments[hre.network.name];

const GAS_PRICE = 62e9;

// Deployment
async function main() {
  let totalGas = 0;
  let gasUsed;

  console.log("\n\nDeploying Logic...");

  const ethWrapLogic = await EthWrapLogic.new({ gasPrice: GAS_PRICE });
  ({ gasUsed } = await web3.eth.getTransactionReceipt(
    ethWrapLogic.transactionHash
  ));
  totalGas += gasUsed;
  data["EthWrapLogic"] = ethWrapLogic.address;
  console.log("\tEthWrap Logic:", ethWrapLogic.address);

  const registry = await EthaRegistryTruffle.at(data.EthaRegistry);
  console.log("\tEtha Registry:", registry.address);

  console.log("\nEnabling logic contract...");
  const { receipt } = await registry.enableLogic(ethWrapLogic.address, {
    gasPrice: GAS_PRICE,
  });
  totalGas += receipt.gasUsed;

  console.log("\nTotal Gas Used:", totalGas);

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
