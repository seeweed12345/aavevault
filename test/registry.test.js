const EthaRegistry = artifacts.require("EthaRegistry");
const EthaRegistryMockV2 = artifacts.require("EthaRegistryMockV2");
const ProxyAdmin = artifacts.require("ProxyAdmin");
const SmartWallet = artifacts.require("SmartWallet");

const { web3 } = ProxyAdmin;
const { expectRevert } = require("@openzeppelin/test-helpers");
const { deployWithProxy } = require("../helpers");

const FEE = 1000;

/**
 *
 * You need just new contract inherit from old and add new functions
 * Old data will be saved
 */

contract("EthaRegistry", ([deployer, owner, alice, multisig, random]) => {
  let registry;
  let proxyAdmin;
  let v1;
  let v2;
  let sw;

  before(async function () {
    proxyAdmin = await ProxyAdmin.new();

    const registryDeployment = await deployWithProxy(
      EthaRegistry,
      proxyAdmin.address,
      multisig,
      multisig,
      FEE
    );
    registry = registryDeployment.contract;
    v1 = registryDeployment.implementation;
  });

  it("should get correct proxyAdmin owner", async function () {
    const _owner = await proxyAdmin.owner();
    assert.equal(_owner, deployer);
  });

  it("should get correct registry proxy admin", async function () {
    const admin = await proxyAdmin.getProxyAdmin(registry.address);
    assert.equal(admin, proxyAdmin.address);
  });

  it("should get correct registry implementation", async function () {
    assert.equal(
      await proxyAdmin.getProxyImplementation(registry.address),
      v1.address
    );
  });

  it("should transfer proxyAdmin ownership to multisig", async function () {
    await expectRevert.unspecified(
      proxyAdmin.transferOwnership(multisig, { from: random })
    );
    await proxyAdmin.transferOwnership(multisig, {
      from: deployer,
    });
  });

  it("should be able to renounce ownership of registry implementation", async function () {
    await expectRevert.unspecified(v1.renounceOwnership({ from: random }));
    await v1.renounceOwnership({
      from: deployer,
    });
  });

  it("only multisig should assign smart wallet implementation", async function () {
    sw = await SmartWallet.new();

    await expectRevert.unspecified(registry.setImplementation(sw.address), {
      from: random,
    });
    await registry.setImplementation(sw.address, {
      from: multisig,
    });

    const impl = await registry.implementation();
    assert.equal(impl, sw.address);
  });

  it("should correctly upgrade registry using multisig", async function () {
    v2 = await EthaRegistryMockV2.new();
    registry = await EthaRegistryMockV2.at(registry.address);

    // pre-upgrade checks
    await expectRevert(
      registry.foo(),
      "VM Exception while processing transaction: revert"
    );

    // upgrade
    await expectRevert.unspecified(
      proxyAdmin.upgrade(registry.address, v2.address, { from: random })
    );
    await proxyAdmin.upgrade(registry.address, v2.address, { from: multisig });

    // after-upgrade checks
    assert.equal(
      await proxyAdmin.getProxyImplementation(registry.address),
      v2.address
    );

    // Function now works in new implementation
    assert.equal(await registry.foo(), "buzz");

    // SW impl address is still on proxy storage
    const impl = await registry.implementation();
    assert.equal(impl, sw.address);
  });

  it("should get correct details after upgrade", async function () {
    // after-upgrade checks
    assert.equal(
      await proxyAdmin.getProxyImplementation(registry.address),
      v2.address
    );

    // Function now works in new implementation
    assert.equal(await registry.foo(), "buzz");

    // SW impl address is still on proxy storage
    const impl = await registry.implementation();
    assert.equal(impl, sw.address);
  });
});
