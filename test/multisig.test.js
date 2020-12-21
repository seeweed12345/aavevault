const MultiSig = artifacts.require("MultiSigWallet");
const TestToken = artifacts.require("TestToken");
const { expectRevert } = require("@openzeppelin/test-helpers");

const toWei = (amount) => web3.utils.toWei(String(amount));
const fromWei = (amount) => +web3.utils.fromWei(String(amount));

contract("MultiSig Wallet", ([deployer, owner, alice, bob, charlie]) => {
  let multisig;

  before(async function () {
    multisig = await MultiSig.new([alice, bob, charlie], 2);
    token = await TestToken.new();

    // send ETH to multisig
    await web3.eth.sendTransaction({
      from: deployer,
      to: multisig.address,
      value: toWei(10),
    });

    // send ERC20 token to multisig
    await token.transfer(multisig.address, toWei(100));
  });

  it("should get correct wallet owners", async function () {
    const owners = await multisig.getOwners();
    assert(owners.includes(alice));
    assert(owners.includes(bob));
    assert(owners.includes(charlie));
  });

  it("should get correct required owners", async function () {
    const required = await multisig.required();
    assert.equal(required, 2);
  });

  it("only owner should be able to submit a transaction", async function () {
    // Submit transaction to withdraw 10 ETH to owner address
    await multisig.submitTransaction(owner, toWei(10), "0x", { from: alice });
  });

  it("should confirm a transaction after 2 owners accept", async function () {
    const initialBalance = await web3.eth.getBalance(owner);
    await multisig.confirmTransaction(0, { from: bob }); /// triggers execution
    const finalBalance = await web3.eth.getBalance(owner);

    assert.equal(fromWei(initialBalance) + 10, fromWei(finalBalance));
  });

  it("should be able to submit an ERC20 withdraw transaction", async function () {
    const encoded = web3.eth.abi.encodeFunctionCall(
      {
        name: "transfer",
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
      [owner, toWei(50)]
    );
    // Submit transaction to withdraw 50 ERC20 tokens to owner address
    await multisig.submitTransaction(token.address, 0, encoded, {
      from: alice,
    });
  });

  it("should confirm ERC20 withdrawal after 2 owners accept", async function () {
    const initialBalance = await token.balanceOf(owner);
    await multisig.confirmTransaction(1, { from: bob }); /// triggers execution
    const finalBalance = await token.balanceOf(owner);

    assert.equal(fromWei(initialBalance) + 50, fromWei(finalBalance));
  });
});
