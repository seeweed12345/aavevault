// Artifacts
const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const TransferLogic = artifacts.require("TransferLogic");
const UniswapLogic = artifacts.require("UniswapLogic");
const CurveLogic = artifacts.require("CurveLogic");
const AaveLogic = artifacts.require("AaveLogic");
const DyDxLogic = artifacts.require("DyDxLogic");
const CompoundLogic = artifacts.require("CompoundLogic");

// Params
const FEE = 1000;
const MULTISIG = "0x9Fd332a4e9C7F2f0dbA90745c1324Cc170D16fE4";

// Deployment
async function main() {
  const transfers = await TransferLogic.new();
  console.log("\nTransfers Logic:", transfers.address);

  const aave = await AaveLogic.new();
  console.log("\nAave Logic:", aave.address);

  const dydx = await DyDxLogic.new();
  console.log("\nDydx Logic:", dydx.address);

  const compound = await CompoundLogic.new();
  console.log("\nCompound Logic:", compound.address);

  const uniswap = await UniswapLogic.new();
  console.log("\nUniswap Logic:", uniswap.address);

  const curve = await CurveLogic.new();
  console.log("\nCurve Logic:", curve.address);

  const smartWalletImpl = await SmartWallet.new();
  console.log("\nSmart Wallet Implementation:", smartWalletImpl.address);

  const EthaRegistry = await ethers.getContractFactory("EthaRegistry");
  const proxy = await upgrades.deployProxy(EthaRegistry, [
    smartWalletImpl.address,
    MULTISIG,
    MULTISIG,
    FEE,
  ]);
  const registry = await EthaRegistryTruffle.at(proxy.address);
  console.log("\nEtha Registry:", registry.address);

  console.log("\nEnabling logic contracts...");
  await registry.enableLogicMultiple([
    transfers.address,
    uniswap.address,
    curve.address,
    aave.address,
    compound.address,
    dydx.address,
  ]);

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
