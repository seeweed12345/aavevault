const fs = require("fs");
const deployments = require("../deployments.json");

// === ARTIFACTS ===

// Protocol
const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const TransferLogic = artifacts.require("TransferLogic");
const InverseLogic = artifacts.require("InverseLogic");

// Swap
const UniswapLogic = artifacts.require("UniswapLogic");
const CurveLogic = artifacts.require("CurveLogic");
const BalancerLogic = artifacts.require("BalancerLogic");

// Lending
const AaveLogic = artifacts.require("AaveLogic");
const DyDxLogic = artifacts.require("DyDxLogic");
const CompoundLogic = artifacts.require("CompoundLogic");

// Params
const FEE = 1000;
const MULTISIG = "0x9Fd332a4e9C7F2f0dbA90745c1324Cc170D16fE4";

let data = deployments[hre.network.name];

// Deployment
async function main() {
  let totalGas = 0;
  let gasUsed;

  console.log("\n\nDeploying Logics...");

  const transfers = await TransferLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(
    transfers.transactionHash
  ));
  totalGas += gasUsed;
  data["TransferLogic"] = transfers.address;
  console.log("\tTransfers Logic:", transfers.address);

  const aave = await AaveLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(aave.transactionHash));
  totalGas += gasUsed;
  data["AaveLogic"] = aave.address;
  console.log("\tAave Logic:", aave.address);

  const dydx = await DyDxLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(dydx.transactionHash));
  totalGas += gasUsed;
  data["DyDxLogic"] = dydx.address;
  console.log("\tDydx Logic:", dydx.address);

  const compound = await CompoundLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(
    compound.transactionHash
  ));
  totalGas += gasUsed;
  data["CompoundLogic"] = compound.address;
  console.log("\tCompound Logic:", compound.address);

  const uniswap = await UniswapLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(uniswap.transactionHash));
  totalGas += gasUsed;
  data["UniswapLogic"] = uniswap.address;
  console.log("\tUniswap Logic:", uniswap.address);

  const curve = await CurveLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(curve.transactionHash));
  totalGas += gasUsed;
  data["CurveLogic"] = curve.address;
  console.log("\tCurve Logic:", curve.address);

  const balancer = await BalancerLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(
    balancer.transactionHash
  ));
  totalGas += gasUsed;
  data["BalancerLogic"] = balancer.address;
  console.log("\tBalancer Logic:", balancer.address);

  const inverse = await InverseLogic.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(inverse.transactionHash));
  totalGas += gasUsed;
  data["InverseLogic"] = inverse.address;
  console.log("\tInverseLogic:", inverse.address);

  console.log("\nDeploying Smart Wallet Implementation...");
  const smartWalletImpl = await SmartWallet.new();
  ({ gasUsed } = await web3.eth.getTransactionReceipt(
    smartWalletImpl.transactionHash
  ));
  totalGas += gasUsed;
  data["SmartWallet"] = smartWalletImpl.address;
  console.log("\tImplementation:", smartWalletImpl.address);

  console.log("\nDeploying Registry...");
  const EthaRegistry = await ethers.getContractFactory("EthaRegistry");
  const proxy = await upgrades.deployProxy(EthaRegistry, [
    smartWalletImpl.address,
    MULTISIG,
    MULTISIG,
    FEE,
  ]);
  ({ gasUsed } = await web3.eth.getTransactionReceipt(
    proxy.deployTransaction.hash
  ));
  totalGas += gasUsed;
  data["EthaRegistry"] = proxy.address;
  const registry = await EthaRegistryTruffle.at(proxy.address);
  console.log("\tEtha Registry:", registry.address);

  console.log("\nEnabling logic contracts...");
  const { receipt } = await registry.enableLogicMultiple([
    transfers.address,
    inverse.address,
    uniswap.address,
    curve.address,
    balancer.address,
    aave.address,
    compound.address,
    dydx.address,
  ]);
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
