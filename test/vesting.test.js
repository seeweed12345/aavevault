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

contract("Vesting", ([owner, alice, bob, charlie, random]) => {
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
    const impl = await factory.getImplementation();

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

    this.amounts = amounts;

    amountPerPeriod = amounts[1];

    let vestingPeriods = [Number(await time.latest()) + 3600]; // 1h from now
    for (let i = 1; i < TOTAL_PERIODS; i++) {
      vestingPeriods.push(
        vestingPeriods[0] + Number(time.duration.days(i * PERIOD_DAYS))
      );
    }

    this.vestingPeriods = vestingPeriods;

    console.log("\n\t=== VESTING SCHEDULE ===\n");
    for (const i in amounts) {
      console.log(
        `\tPeriod ${i}: ${Number(fromWei(amounts[i])).toFixed(2)} (${new Date(
          vestingPeriods[i] * 1000
        ).toUTCString()})`
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

    const vested = await factory.getVestingContract(alice);
    instance = await TokenVesting.at(vested);

    assert(vested != implementation.address);

    expectEvent(tx, "Created", {
      beneficiary: alice,
      vestingContract: vested,
    });
  });

  it("should get correct details from vesting contract", async function () {
    //Transfer tokens to Vesting contract
    await etha.transfer(instance.address, AMOUNT_VESTING);

    const {
      beneficiary,
      token,
      totalReleased,
    } = await instance.getGlobalData();
    const releaseableAmount = await factory.releaseableAmount(alice);
    const balance = await etha.balanceOf(instance.address);

    console.log(fromWei(releaseableAmount));

    assert.equal(token, etha.address);
    assert.equal(beneficiary, alice);
    assert.equal(totalReleased, 0);
    assert.equal(releaseableAmount, 0);
    assert.equal(balance, AMOUNT_VESTING);
  });

  it("should not be able to initialize vesting contract again", async function () {
    await expectRevert(
      instance.initialize(
        this.vestingPeriods,
        this.amounts,
        alice,
        etha.address,
        { from: random }
      ),
      "Already Initialized!"
    );
  });

  it("should be able to release some tokens from vesting contract when first period is reached", async function () {
    // 3 days go by..
    await time.increase(time.duration.days(3));

    const initialBalance = await etha.balanceOf(alice);
    assert.equal(initialBalance, 0);

    // Trigger token release by another user
    await instance.release({ from: bob });

    const finalBalance = await etha.balanceOf(alice);
    this.claimed = fromWei(finalBalance);
    this.claimedInWei = finalBalance;
    console.log("\tClaimed ETHA at Deployment:", fromWei(finalBalance));
    assert(fromWei(finalBalance) > 0);
  });

  it("should not be able to release tokens for same period when already claimed", async function () {
    // Trigger token release
    await expectRevert(
      instance.release({ from: alice }),
      "Nothing to release yet"
    );

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
    await expectRevert(
      instance.release({ from: alice }),
      "Nothing to release yet"
    );
    const finalBalance = await etha.balanceOf(alice);
    console.log(
      "\tClaimed ETHA tokens in same period:",
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
    const { totalReleased } = await instance.getGlobalData();
    const vestedBalance = await etha.balanceOf(instance.address);

    assert.equal(vestedBalance, 0);
    assert.equal(totalReleased, AMOUNT_VESTING);
  });

  it("should change state in implementation contract with fake token", async function () {
    const fakeToken = await RewardsToken.new();
    await fakeToken.mint(implementation.address, toWei(10000));

    await implementation.initialize(
      this.vestingPeriods,
      this.amounts,
      bob,
      fakeToken.address
    );

    await implementation.release({ from: bob });

    const {
      beneficiary,
      releasedPeriods,
    } = await implementation.getGlobalData();

    assert.equal(beneficiary, bob);
    assert.equal(releasedPeriods, 12);
  });

  it("should deploy a second token vesting contract correctly", async function () {
    // Deploy Token Vesting for Charlie
    await factory.deployVesting(
      this.vestingPeriods,
      this.amounts,
      charlie,
      etha.address,
      {
        from: owner,
      }
    );

    const vested = await factory.getVestingContract(charlie);
    instance = await TokenVesting.at(vested);

    const {
      releasedPeriods,
      totalReleased,
      beneficiary,
      token,
    } = await instance.getGlobalData();

    assert.equal(releasedPeriods, 0);
    assert.equal(totalReleased, 0);
    assert.equal(beneficiary, charlie);
    assert.equal(token, etha.address);
  });
});
