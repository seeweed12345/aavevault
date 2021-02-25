const RewardsToken = artifacts.require("RewardsToken");
const TokenVesting = artifacts.require("TokenVesting");
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

// PARAMETERS
const AMOUNT_VESTING = toWei("100");
const TOTAL_PERIODS = 12;
const PERIOD_DAYS = 30;

contract("Vesting", ([owner, alice, bob, random]) => {
  let etha, factory, implementation, instance, now;

  before(async function () {
    now = Number(await time.latest());
    etha = await RewardsToken.new();
    implementation = await TokenVesting.new();
    factory = await VestingFactory.new();

    await etha.mint(owner, toWei(10000));
  });

  it("should set token vesting implementation", async function () {
    await factory.setImplementation(implementation.address, { from: owner });
    const impl = await factory.implementation();

    assert.equal(impl, implementation.address);
  });

  it("should deploy a token vesting contract", async function () {
    // Total Amount divided into 12 claims
    const amounts = Array(12).fill(
      new BN(AMOUNT_VESTING).div(new BN(String(TOTAL_PERIODS)))
    );
    const totalAmount = amounts.reduce((a, b) => a.add(b));
    // Add dust to first claim
    amounts[0] = amounts[0].add(new BN(AMOUNT_VESTING).sub(totalAmount));

    // Vesting periods (first claim now, rest every 30 days)
    let vestingPeriods = [Number(now)];
    for (let i = 1; i < TOTAL_PERIODS; i++) {
      vestingPeriods.push(
        Number(now) + Number(time.duration.days(i * PERIOD_DAYS))
      );
    }

    // Approve Factory to spend ETHA tokens
    await etha.approve(factory.address, AMOUNT_VESTING);

    // Deploy Token Vesting for Alice
    const tx = await factory.deployVesting(
      vestingPeriods,
      amounts,
      alice,
      etha.address,
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
      amount: toWei("100"),
    });
  });

  it("should get correct details from vesting contract", async function () {
    const vested = await factory.vestings(alice);
    instance = await TokenVesting.at(vested);

    const token = await instance.token();
    const beneficiary = await instance.beneficiary();
    const firstPeriod = await instance.timeperiods(0);
    const secondPeriod = await instance.timeperiods(1);
    const released = await instance.released();
    const balance = await etha.balanceOf(vested);

    const _secondPeriod = Number(now) + Number(time.duration.days(30));

    assert.equal(token, etha.address);
    assert.equal(beneficiary, alice);
    assert.equal(firstPeriod, now);
    assert.equal(secondPeriod, _secondPeriod);
    assert.equal(released, 0);
    assert.equal(balance, toWei("100"));
  });

  it("should be able to release tokens from vesting contract when deployed", async function () {
    const initialBalance = await etha.balanceOf(alice);
    assert.equal(initialBalance, 0);

    // Trigger token release
    await instance.release({ from: alice });

    const finalBalance = await etha.balanceOf(alice);
    this.claimed = fromWei(finalBalance);
    console.log("\tClaimed ETHA at Deployment:", fromWei(finalBalance));
    assert(fromWei(finalBalance) > 0);
  });

  it("should be able to release tokens from vesting contract after 30 days", async function () {
    // 30 days go by..
    await time.increase(time.duration.days(30));

    // Trigger token release
    await instance.release({ from: alice });

    const finalBalance = await etha.balanceOf(alice);
    console.log(
      "\tClaimed ETHA after 30 days:",
      fromWei(finalBalance) - this.claimed
    );
    const amountPerPeriod = fromWei(
      new BN(AMOUNT_VESTING).div(new BN(String(TOTAL_PERIODS)))
    );
    assert.equal(fromWei(finalBalance), this.claimed + amountPerPeriod);
    this.claimed = fromWei(finalBalance);
  });

  it("should be able to release all tokens", async function () {
    // 10 more months
    await time.increase(time.duration.days(10 * 30));

    // Trigger token release
    await instance.release({ from: alice });

    const finalBalance = await etha.balanceOf(alice);
    console.log("\tTotal Claimed ETHA tokens:", fromWei(finalBalance));

    assert(fromWei(finalBalance) > this.claimed);
  });

  it("should get correct details from vesting contract", async function () {
    const released = await instance.released();
    const vestedBalance = await etha.balanceOf(instance.address);

    assert.equal(vestedBalance, 0);
    assert.equal(released, AMOUNT_VESTING);
  });
});
