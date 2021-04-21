const SmartWallet = artifacts.require("SmartWallet");

const { expectRevert } = require("@openzeppelin/test-helpers");

const FEE = 1000;

contract("EthaRegistry", ([owner, alice, multisig, random]) => {
  let registry;

  before(async function () {
    const impl = await SmartWallet.new();

    const EthaRegistry = await ethers.getContractFactory("EthaRegistry");
    registry = await upgrades.deployProxy(EthaRegistry, [
      impl.address,
      multisig,
      multisig,
      FEE,
    ]);
  });

  it("should check not allowed addresses", async function () {
    const notAllowed = await registry.notAllowed(
      "0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d"
    );
    assert(notAllowed);
  });

  it("should not be able to call the foo function", async function () {
    try {
      await registry.foo();
    } catch (error) {
      assert.equal(error.message, "registry.foo is not a function");
    }
  });

  it("should upgrade proxy contract", async function () {
    const EthaRegistryMockV2 = await ethers.getContractFactory(
      "EthaRegistryMockV2"
    );
    registry = await upgrades.upgradeProxy(
      registry.address,
      EthaRegistryMockV2
    );
  });

  it("should check if contract remains with the same storage", async function () {
    const notAllowed = await registry.notAllowed(
      "0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d" // aDAI
    );
    assert(notAllowed);
  });

  it("should not be able to call the foo function", async function () {
    const res = await registry.foo();
    assert.equal(res, "buzz");
  });

  it("should be able to register a logic contract", async function () {
    const AaveLogic = await ethers.getContractFactory("AaveLogic");
    const aave = await AaveLogic.deploy();

    await registry.enableLogic(aave.address);

    const registered = await registry.logicProxies(aave.address);

    assert(registered);
  });

  it("should be able to register a multiple logic contracts", async function () {
    const TransferLogic = await ethers.getContractFactory("TransferLogic");
    const CompoundLogic = await ethers.getContractFactory("CompoundLogic");
    const transfers = await TransferLogic.deploy();
    const compound = await CompoundLogic.deploy();

    await registry.enableLogicMultiple([transfers.address, compound.address]);

    let registered = await registry.logicProxies(transfers.address);
    assert(registered);

    registered = await registry.logicProxies(compound.address);
    assert(registered);
  });
});
