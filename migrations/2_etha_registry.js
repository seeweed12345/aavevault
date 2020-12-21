const fs = require("fs");

const EthaRegistry = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const ProxyAdmin = artifacts.require("ProxyAdmin");

let totalGas = 0;

const FEE = 0; // 1% = 1000
const MULTI_SIG_ADDRESS = "0x9Fd332a4e9C7F2f0dbA90745c1324Cc170D16fE4";

module.exports = async function (truffle, network, [deployer]) {
  if (network === "development") return;

  const { deployWithProxy, setArtifacts } = require("../helpers");

  setArtifacts(artifacts);

  await truffle.deploy(ProxyAdmin);
  const proxyAdmin = await ProxyAdmin.deployed();

  // ethaRegistry
  const registryDeployment = await deployWithProxy(
    EthaRegistry,
    proxyAdmin.address,
    // Initializable params
    deployer, // owner
    MULTI_SIG_ADDRESS, // fee recipient
    FEE
  );
  const ethaRegistry = registryDeployment.contract;
  const ethaRegistryV1 = registryDeployment.implementation;

  const { txHashes } = registryDeployment;

  for (let i = 0; i < txHashes.length; i++) {
    const receipt = await web3.eth.getTransactionReceipt(txHashes[i]);
    totalGas += web3.utils.toDecimal(receipt.gasUsed);
  }

  const json = JSON.stringify({
    address: ethaRegistry.address,
    abi: ethaRegistry.abi,
  });

  fs.writeFile("registry.json", json, "utf8", () => {});

  // SmartWallet Implementation
  const smartWalletV1 = await truffle.deploy(SmartWallet);
  let tx = await ethaRegistry.setImplementation(smartWalletV1.address);
  totalGas += tx.receipt.gasUsed;

  // Ownership
  tx = await ethaRegistry.transferOwnership(MULTI_SIG_ADDRESS);
  totalGas += tx.receipt.gasUsed;

  tx = await ethaRegistryV1.renounceOwnership();
  totalGas += tx.receipt.gasUsed;

  tx = await proxyAdmin.transferOwnership(MULTI_SIG_ADDRESS);
  totalGas += tx.receipt.gasUsed;

  console.log("\nExtra ETH used in deployment:", (totalGas * 20) / 1e9);
};
