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
const toBN = (value) => new BN(String(value));

// PARAMETERS
const AMOUNT_VESTING = toWei("1000");
const TOTAL_PERIODS = 12;
const PERIOD_DAYS = 30;
const PERCENTAGE_FOR_FIRST_RELEASE = 20;

let firstClaimAmount;
let amountPerPeriod = 0;

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
    await expectRevert(
      factory.setImplementation(implementation.address, { from: random }),
      "Ownable: caller is not the owner"
    );
    await factory.setImplementation(implementation.address, { from: owner });
    const impl = await factory.implementation();

    assert.equal(impl, implementation.address);
  });

  it("should deploy a token vesting contract", async function () {
    // First Claim 20% of Total
    const _firstClaimAmount = toBN(AMOUNT_VESTING)
      .mul(toBN(PERCENTAGE_FOR_FIRST_RELEASE))
      .div(toBN(100));

    // Remaining for vested periods
    const leftAmount = toBN(AMOUNT_VESTING).sub(toBN(_firstClaimAmount));

    // Total Amount divided into 12 claims
    const amounts = Array(12).fill(
      toBN(leftAmount).div(toBN(TOTAL_PERIODS - 1))
    );

    const totalAmount = amounts.reduce((a, b) => a.add(b));

    // Add dust to first claim
    amounts[0] = amounts[0].add(new BN(AMOUNT_VESTING).sub(totalAmount));
    firstClaimAmount = amounts[0];

    amountPerPeriod = amounts[1];

    // Vesting periods (first claim now, rest every 30 days)
    let vestingPeriods = [Number(now)];
    for (let i = 1; i < TOTAL_PERIODS; i++) {
      vestingPeriods.push(
        Number(now) + Number(time.duration.days(i * PERIOD_DAYS))
      );
    }

    console.log("\n\t=== VESTING SCHEDULE ===\n");
    for (const i in amounts) {
      console.log(
        `\tPeriod ${i}: ${Number(fromWei(amounts[i])).toFixed(2)} (${
          i == 0 ? "Now!" : new Date(vestingPeriods[i] * 1000).toUTCString()
        })`
      );
    }
    console.log("\n\tTOTAL VESTED:", fromWei(AMOUNT_VESTING));

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

    expectEvent(tx, "Created", {
      beneficiary: alice,
      vestingContract: vested,
    });
  });

  it("should get correct details from vesting contract", async function () {
    const vested = await factory.vestings(alice);
    instance = await TokenVesting.at(vested);

    //Transfer tokens to Vesting contract
    await etha.transfer(vested, AMOUNT_VESTING);

    const token = await instance.token();
    const beneficiary = await instance.beneficiary();
    const firstPeriod = await instance.timeperiods(0);
    const secondPeriod = await instance.timeperiods(1);
    const released = await instance.released();
    const releaseableAmount = await instance.releaseableAmount();
    const balance = await etha.balanceOf(vested);

    const _secondPeriod = Number(now) + Number(time.duration.days(30));
    assert.equal(token, etha.address);
    assert.equal(beneficiary, alice);
    assert.equal(firstPeriod, now);
    assert.equal(secondPeriod, _secondPeriod);
    assert.equal(released, 0);
    assert.equal(String(releaseableAmount), String(firstClaimAmount));
    assert.equal(balance, AMOUNT_VESTING);
  });

  it("should be able to release tokens from vesting contract when deployed", async function () {
    const initialBalance = await etha.balanceOf(alice);
    assert.equal(initialBalance, 0);

    // Trigger token release by another user
    await instance.release({ from: bob });

    const finalBalance = await etha.balanceOf(alice);
    console.log(String(finalBalance));
    this.claimed = fromWei(finalBalance);
    this.claimedInWei = finalBalance;
    console.log("\tClaimed ETHA at Deployment:", fromWei(finalBalance));
    assert(fromWei(finalBalance) > 0);
  });

  it("should not be able to release tokens for same period when already claimed", async function () {
    // Trigger token release
    await instance.release({ from: alice });

    const currentBalance = await etha.balanceOf(alice);
    assert.equal(fromWei(currentBalance), this.claimed);
  });

  it("should be able to release tokens from vesting contract after 30 days", async function () {
    // 30 days go by..
    await time.increase(time.duration.days(30));

    // Trigger token release
    await instance.release({ from: alice });

    const finalBalance = await etha.balanceOf(alice);
    console.log(
      "\tClaimed ETHA after 30 days:",
      fromWei(finalBalance - this.claimedInWei)
    );

    assert.equal(
      Number(finalBalance),
      Number(
        new BN(String(this.claimedInWei)).add(new BN(String(amountPerPeriod)))
      )
    );
    this.claimed = fromWei(finalBalance);
  });

  it("should not be able to release more tokens before next period", async function () {
    // 20 more days
    await time.increase(time.duration.days(20));
    const initialBalance = await etha.balanceOf(alice);

    // Trigger token release
    await instance.release({ from: alice });
    const finalBalance = await etha.balanceOf(alice);
    console.log(
      "\tTotal Claimed ETHA tokens:",
      Number(finalBalance) - Number(initialBalance)
    );

    assert(fromWei(finalBalance) == fromWei(initialBalance));
  });

  it("should be able to release all tokens from multiple periods", async function () {
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
