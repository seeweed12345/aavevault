const RewardsToken = artifacts.require("RewardsToken");
const TokenTimelock = artifacts.require("TokenTimelock");
const VestingFactory = artifacts.require("VestingFactory");

const {
  BN,
  expectEvent,
  expectRevert,
  time,
  constants: { MAX_UINT256 },
} = require("@openzeppelin/test-helpers");

const { assert } = require("hardhat");

// HELPERS
const toWei = (value) => web3.utils.toWei(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));

contract("Vesting", ([owner, alice, bob, random]) => {
  let etha, factory, implementation;

  before(async function () {
    etha = await RewardsToken.new();
    implementation = await TokenTimelock.new();
    factory = await VestingFactory.new();

    await etha.mint(owner, toWei(10000));
  });

  it("should set token vesting implementation", async function () {
    await factory.setImplementation(implementation.address, { from: owner });
    const impl = await factory.implementation();

    assert.equal(impl, implementation.address);
  });

  it("should deploy a token vesting contract", async function () {
    const amount = toWei("100");

    const now = await time.latest();
    const vestedTime = Number(now) + Number(time.duration.years(1));

    // Approve Factory to spend ETHA tokens
    await etha.approve(factory.address, amount);

    // Deploy Token Vesting for Alice
    const tx = await factory.deployVesting(
      alice,
      etha.address,
      amount,
      vestedTime,
      {
        from: owner,
      }
    );

    const vested = await factory.vestings(alice);

    assert(vested != implementation.address);

    expectEvent(tx, "Vested", {
      beneficiary: alice,
      vestingContract: vested,
      token: etha.address,
      amount,
      releaseTime: new BN(String(vestedTime)),
    });
  });

  it("should get correct details from vesting contract", async function () {
    const vested = await factory.vestings(alice);
    const instance = await TokenTimelock.at(vested);

    const token = await instance.token();
    const beneficiary = await instance.beneficiary();
    const releaseTime = await instance.releaseTime();
    const balance = await etha.balanceOf(vested);

    const now = await time.latest();
    const vestedTime = Number(now) + Number(time.duration.years(1));

    assert.equal(token, etha.address);
    assert.equal(beneficiary, alice);
    assert.equal(balance, toWei("100"));
    assert(Number(releaseTime) < vestedTime);
  });

  it("should be able to release tokens from vesting contract", async function () {
    const vested = await factory.vestings(alice);
    const instance = await TokenTimelock.at(vested);

    const initialBalance = await etha.balanceOf(alice);
    assert.equal(initialBalance, 0);

    // One year goes by..
    await time.increase(time.duration.years(1));

    // Trigger token release
    await instance.release({ from: alice });

    const finalBalance = await etha.balanceOf(alice);
    assert.equal(finalBalance, toWei("100"));
  });
});
