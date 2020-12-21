const EthaRegistry = artifacts.require("EthaRegistry");

const DyDxLogic = artifacts.require("DyDxLogic");
const CompoundLogic = artifacts.require("CompoundLogic");
const AaveLogic = artifacts.require("AaveLogic");
const CurveLogic = artifacts.require("CurveLogic");
const TransferLogic = artifacts.require("TransferLogic");
const UniswapLogic = artifacts.require("UniswapLogic");
const StakingLogic = artifacts.require("StakingLogic");

let totalGas = 0;

module.exports = async function (truffle, network) {
  if (network === "development") return;

  const registryArt = require("../registry.json");

  // logics
  await truffle.deploy(CompoundLogic);
  await truffle.deploy(AaveLogic);
  await truffle.deploy(DyDxLogic);
  await truffle.deploy(CurveLogic);
  await truffle.deploy(TransferLogic);
  await truffle.deploy(UniswapLogic);
  await truffle.deploy(StakingLogic);

  const ethaRegistry = await EthaRegistry.at(registryArt.address);

  // Enable Logic Contracts
  let tx = await ethaRegistry.enableLogicMultiple([
    DyDxLogic.address,
    CompoundLogic.address,
    AaveLogic.address,
    CurveLogic.address,
    UniswapLogic.address,
    TransferLogic.address,
    StakingLogic.address,
  ]);

  totalGas += tx.receipt.gasUsed;

  console.log("\nExtra ETH used in deployment:", (totalGas * 20) / 1e9);
};
