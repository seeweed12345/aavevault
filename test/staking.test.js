const RewardsToken = artifacts.require("RewardsToken");
const StakingToken = artifacts.require("StakingToken");
const StakingRewards = artifacts.require("StakingRewards");
const StakingRewardsFactory = artifacts.require("StakingRewardsFactory");

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
const REWARD_AMOUNT = toWei("1000");
const REWARD_DURATION = 86400; //1 DAY
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

contract("StakingRewardsFactory", ([owner, alice, bob, random]) => {
  let etha, factory, genesis, stakingToken, instance;

  before(async function () {
    // Fix fork time
    const timestamp = Math.floor(Date.parse(new Date()) / 1000);
    await time.increaseTo(timestamp + time.duration.days(1));

    genesis = Number(await time.latest()) + 1000;
    etha = await RewardsToken.new();
    stakingToken = await StakingToken.new();
    factory = await StakingRewardsFactory.new(etha.address, genesis);

    await etha.mint(owner, toWei(10000));
    await stakingToken.mint(alice, toWei(10000));
  });

  it("should deploy staking rewards contract", async function () {
    await expectRevert(
      factory.deploy(stakingToken.address, REWARD_AMOUNT, REWARD_DURATION, {
        from: random,
      }),
      "Ownable: caller is not the owner"
    );

    await factory.deploy(stakingToken.address, REWARD_AMOUNT, REWARD_DURATION, {
      from: owner,
    });

    const stakingRewards = await factory.stakingRewardsInfoByStakingToken(
      stakingToken.address
    );

    assert.notEqual(stakingRewards.stakingRewards, ZERO_ADDRESS);
    assert.equal(stakingRewards.rewardAmount, REWARD_AMOUNT);
  });

  it("should transfer reward tokens to staking contract", async function () {
    await etha.transfer(factory.address, REWARD_AMOUNT, { from: owner });
    await expectRevert(
      factory.notifyRewardAmounts({ from: random }),
      "StakingRewardsFactory::notifyRewardAmount: not ready"
    );

    await time.increase(1000);

    let factoryBalance = await etha.balanceOf(factory.address);
    factoryBalance = fromWei(factoryBalance);

    // Execute reward initialization
    await factory.notifyRewardAmounts({ from: random });

    const stakingRewards = await factory.stakingRewardsInfoByStakingToken(
      stakingToken.address
    );
    let stakingContractBalance = await etha.balanceOf(
      stakingRewards.stakingRewards
    );

    stakingContractBalance = fromWei(stakingContractBalance);
    factoryBalance = await etha.balanceOf(factory.address);
    factoryBalance = fromWei(factoryBalance);

    assert.equal(factoryBalance, 0);
    assert.equal(stakingContractBalance, fromWei(REWARD_AMOUNT));
  });

  it("should be able to stake staking token", async function () {
    let stakingRewards = await factory.stakingRewardsInfoByStakingToken(
      stakingToken.address
    );
    stakingRewards = stakingRewards.stakingRewards;
    instance = await StakingRewards.at(stakingRewards);
    let stakingAmount = toWei(100);
    await expectRevert(
      instance.stake(stakingAmount, { from: alice }),
      "SafeERC20: low-level call failed"
    );
    await stakingToken.approve(stakingRewards, stakingAmount, { from: alice });
    const tx = await instance.stake(stakingAmount, {
      from: alice,
    });

    expectEvent(tx, "Staked", {
      user: alice,
      amount: toWei(100),
    });
  });

  it("should be able to claim staked token", async function () {
    await time.increase(time.duration.days(1));
    await instance.getReward({ from: alice });
    balance = await etha.balanceOf(alice);
    assert.notEqual(balance, 0);
  });

  it("should be able to withdraw all funds", async function () {
    await time.increase(time.duration.days(1));
    await instance.exit({ from: alice });
    let stakingTokenBalance = await stakingToken.balanceOf(instance.address);
    stakingTokenBalance = Number(stakingTokenBalance);
    assert.equal(stakingTokenBalance, 0);
  });
});
