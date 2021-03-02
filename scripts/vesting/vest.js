const VestingFactory = artifacts.require("VestingFactory");
const TokenVesting = artifacts.require("TokenVesting");

const { time } = require("@openzeppelin/test-helpers");

// HELPERS
const toWei = (value) => web3.utils.toWei(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));
const toBN = (value) => new web3.utils.BN(String(value));

// PARAMS
const AMOUNT_VESTING = toWei("1000");
const TOTAL_PERIODS = 12;
const PERIOD_DAYS = 30;
const PERCENTAGE_FOR_FIRST_RELEASE = 20;
const USER = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
const ETHA = "0x4198270a8e152b1a1a8e43e954426d60ad2b1199";

const getParams = async () => {
  const { timestamp: now } = await web3.eth.getBlock();

  // First Claim 20% of Total
  const _firstClaimAmount = toBN(AMOUNT_VESTING)
    .mul(toBN(PERCENTAGE_FOR_FIRST_RELEASE))
    .div(toBN(100));

  // Remaining for vested periods
  const leftAmount = toBN(AMOUNT_VESTING).sub(toBN(_firstClaimAmount));

  // Total Amount divided into 12 claims
  const amounts = Array(12).fill(toBN(leftAmount).div(toBN(TOTAL_PERIODS - 1)));

  const totalAmount = amounts.reduce((a, b) => a.add(b));

  // Add dust to first claim
  amounts[0] = amounts[0].add(toBN(AMOUNT_VESTING).sub(totalAmount));
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

  return { vestingPeriods, amounts };
};

async function main() {
  console.log("Deploying vesting contract for:", USER);

  const factory = await VestingFactory.at(
    "0x2226b9E355324537Ca0af203d89e26e818e88Bf7"
  );

  const { vestingPeriods, amounts } = await getParams();

  console.log(amounts);

  // Deploy Token Vesting for Alice
  const { receipt } = await factory.deployVesting(
    vestingPeriods,
    amounts,
    USER,
    ETHA
  );

  console.log(
    "\nTransaction:",
    `https://etherscan.io/tx/${receipt.transactionHash}`
  );
  console.log("Gas Used:", receipt.gasUsed);

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
