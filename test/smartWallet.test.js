const EthaRegistry = artifacts.require("EthaRegistry");
const TransferLogic = artifacts.require("TransferLogic");
const ProxyAdmin = artifacts.require("ProxyAdmin");
const SmartWallet = artifacts.require("SmartWallet");
const SmartWalletMockV2 = artifacts.require("SmartWalletMockV2");
const SmartWalletMiddlewareProxy = artifacts.require(
  "SmartWalletMiddlewareProxy"
);
const { deployWithProxy } = require("../helpers");
const { web3 } = SmartWallet;
const { expectRevert } = require("@openzeppelin/test-helpers");

const FEE = 1000;
const toWei = (amount) => web3.utils.toWei(String(amount));

contract("SmartWallet", ([deployer, owner, alice, bob, charlie]) => {
  let transfers;
  let registry;
  let proxyAdmin;

  beforeEach(async function () {
    transfers = await TransferLogic.new();
    proxyAdmin = await ProxyAdmin.new();

    const registryDeployment = await deployWithProxy(
      EthaRegistry,
      proxyAdmin.address,
      owner,
      FEE
    );
    registry = registryDeployment.contract;

    const smartWalletV1 = await SmartWallet.new();
    const smartWalletMiddlewareProxy = await SmartWalletMiddlewareProxy.new();
    await registry.setImplementation(
      web3.utils.utf8ToHex("SMART_WALLET"),
      smartWalletV1.address,
      { from: owner }
    );
    await registry.setSmartWalletMiddleware(
      smartWalletMiddlewareProxy.address,
      { from: owner }
    );

    await registry.enableLogicMultiple([transfers.address], { from: owner });
  });

  it("should create a proxied wallet", async function () {
    const res = await registry.deployWallet({ from: charlie });
    const aliceWallet = await SmartWallet.at(res.logs[0].args.proxy);

    assert.equal(await aliceWallet.isOwner(charlie), true);

    // deny initializing again
    await expectRevert(
      aliceWallet.initialize(registry.address, alice),
      "Contract instance has already been initialized"
    );
  });

  it("should allow upgrading implementations", async function () {
    const res = await registry.deployWallet({ from: charlie });
    const charliesWalletAddress = res.logs[0].args.proxy;
    let charliesWallet = await SmartWalletMockV2.at(charliesWalletAddress);

    await expectRevert(
      charliesWallet.foo(),
      "Returned values aren't valid, did it run Out of Gas?"
    );

    const smartWalletV2 = await SmartWalletMockV2.new();
    await registry.setImplementation(
      web3.utils.utf8ToHex("SMART_WALLET"),
      smartWalletV2.address,
      { from: owner }
    );

    assert.equal(await charliesWallet.foo(), "bar");
  });

  it("should be able to use logic contracts", async function () {
    const res = await registry.deployWallet({ from: charlie });
    const charliesWalletAddress = res.logs[0].args.proxy;

    const smartWalletV2 = await SmartWalletMockV2.new();
    await registry.setImplementation(
      web3.utils.utf8ToHex("SMART_WALLET"),
      smartWalletV2.address,
      { from: owner }
    );

    let charliesWallet = await SmartWalletMockV2.at(charliesWalletAddress);
    let data = web3.eth.abi.encodeFunctionCall(
      {
        name: "deposit",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "erc20",
          },
          {
            type: "uint256",
            name: "amount",
          },
        ],
      },
      ["0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", toWei(1)]
    );

    let { receipt } = await charliesWallet.execute(
      [transfers.address],
      [data],
      false,
      {
        from: charlie,
        value: toWei(1),
      }
    );

    console.log("\tGas Used:", receipt.gasUsed);

    let balance = await web3.eth.getBalance(charliesWalletAddress);
    assert.equal(balance, toWei(1));

    data = web3.eth.abi.encodeFunctionCall(
      {
        name: "withdraw",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "erc20",
          },
          {
            type: "uint256",
            name: "amount",
          },
        ],
      },
      ["0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", toWei(1)]
    );

    let { receipt: receipt2 } = await charliesWallet.execute(
      [transfers.address],
      [data],
      false,
      {
        from: charlie,
      }
    );

    console.log("\tGas Used:", receipt2.gasUsed);

    balance = await web3.eth.getBalance(charliesWalletAddress);
    assert.equal(balance, 0);
  });
});
