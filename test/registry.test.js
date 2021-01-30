const { expectRevert } = require("@openzeppelin/test-helpers");

const FEE = 1000;

contract("EthaRegistry", ([owner, alice, multisig, random]) => {
  let registry;
  let proxyAdmin;
  let v1;
  let v2;
  let sw;

  before(async function () {
    const EthaRegistry = await ethers.getContractFactory("EthaRegistry");
    v1 = await EthaRegistry.deploy();
    registry = await upgrades.deployProxy(EthaRegistry, [
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
      "0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d"
    );
    assert(notAllowed);
  });
});
