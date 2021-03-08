const ETHAToken = artifacts.require("ETHAToken");
const TokenVesting = artifacts.require("TokenVesting");
const VestingFactory = artifacts.require("VestingFactory");

const { assert } = require("hardhat");
const vestings = require("./data");

const ETHA_ADDRESS = "0x59e9261255644c411afdd00bd89162d09d862e38";
const FACTORY_ADDRESS = "0xd6aB735E3E2A1dd7deae5959D868057C284CecBc";

const toWei = (value) => web3.utils.toWei(String(value));
const toBN = (value) => new web3.utils.BN(String(value));
const fromWei = (value) => Number(web3.utils.fromWei(String(value)));
const toChecksum = (address) => web3.utils.toChecksumAddress(address);
const formatAdd = (address) =>
  address.substring(0, 5) + "..." + address.substring(37, 42);
function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // Instances
  const factory = await VestingFactory.at(FACTORY_ADDRESS);
  const token = await ETHAToken.at(ETHA_ADDRESS);

  const totalETHA = vestings.map((t) => t.amount).reduce((a, b) => a + b);

  console.log("\nTotal vestings to fund:", vestings.length);
  console.log("\nTotal ETHA to send:", totalETHA);
  console.log("\nStarting...");

  let totalSent = toBN(0);

  for (const i in vestings) {
    const { amount, user, contract } = vestings[i];
    const amountWei = toWei(amount);

    const vestingContract = await factory.getVestingContract(user);
    assert.equal(
      vestingContract,
      toChecksum(contract),
      "Contract addresses do not match"
    );

    const balance = await token.balanceOf(vestingContract);
    assert.equal(balance, 0, "Not empty");

    const instance = await TokenVesting.at(vestingContract);

    let totalToSend = toBN(0);
    let initialTimestamp;
    for (let j = 0; j < 12; j++) {
      const { amount: periodAmount, timestamp } = await instance.getPeriodData(
        j
      );
      if (j === 0) initialTimestamp = timestamp;

      totalToSend = totalToSend.add(periodAmount);
    }

    assert.equal(initialTimestamp, 1615197600, "Incorrect Timestamp");
    assert.equal(totalToSend, amountWei, "Incorrect value to send");

    console.log(
      `#${i} Sending ${amount.toLocaleString()} ETHA to ${formatAdd(
        contract
      )}. Beneficiary: ${formatAdd(user)}`
    );

    // await token.transfer(vestingContract, amountWei);

    totalSent = totalSent.add(totalToSend);

    await timeout(1000);
  }

  console.log("Total ETHA Sent:", fromWei(totalSent));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
