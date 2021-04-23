const IERC20 = artifacts.require(
  "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20"
);

const toWei = (value) => web3.utils.toWei(String(value));

// Tokens
const CHI = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c";

// ADDRESSES
const HOLDER = "0x4f89e886B7281DB8DED9B604cEcE932063dFdCdc";
const TARGET = process.env.FUNDING_TARGET;

async function main() {
  const chi = await IERC20.at(CHI);

  await chi.transfer(TARGET, 100, { from: HOLDER });

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
