const IERC20 = artifacts.require(
  "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20"
);

const toWei = (value) => web3.utils.toWei(String(value));

// LP Tokens
const ETHA_ETH_LP_UNI = "0xd006f2de9423090359ab04d5858a981161ce9062";
const ETHA_USDC_LP_UNI = "0xc6136ee4c911ed6b1cccaeee9065854435c0b5e0";
const ETHA_USDC_LP_BAL = "0x7B7499Fab431DeE48174f8A775E799DD1542f487";

// ADDRESSES
const HOLDER = "0x1095C57AD5945D1907Ab2C4fb477837a6bE85550";
const TARGET = process.env.FUNDING_TARGET;

async function main() {
  const lp1 = await IERC20.at(ETHA_ETH_LP_UNI);
  await lp1.transfer(TARGET, toWei(10), { from: HOLDER });

  const lp2 = await IERC20.at(ETHA_USDC_LP_UNI);
  await lp2.transfer(TARGET, toWei(0.01), { from: HOLDER });

  const lp3 = await IERC20.at(ETHA_USDC_LP_BAL);
  await lp3.transfer(TARGET, toWei(10), { from: HOLDER });

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
