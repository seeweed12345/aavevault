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
const USER = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const ETHA = "0x59e9261255644c411afdd00bd89162d09d862e38";

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
    "0x5b1869D9A4C187F2EAa108f3062412ecf0526b24"
  );

  const { vestingPeriods, amounts } = await getParams();

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
