const Investments = artifacts.require("Investments");
const Balances = artifacts.require("Balances");

const {} = require("@openzeppelin/test-helpers");

// TOKENS
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const TOKENS = [ETH_ADDRESS, DAI_ADDRESS, USDC_ADDRESS, USDT_ADDRESS];
const NAMES = ["ETH", "DAI", "USDC", "USDT"];

const WALLET = "0x781Fcd0742c122081D604d2381c72d72f9678421";

const tokenDecimals = {
  WETH: 18,
  ETH: 18,
  DAI: 18,
  USDC: 6,
  USDT: 6,
};

const convertToDec = (amount, symbol) => {
  const decimals = tokenDecimals[symbol];
  return Number(amount) / 10 ** Number(decimals);
};

contract("ETHA Adapters", ([owner]) => {
  let adapterInv, adapterBal;

  before(async function () {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
            blockNumber: 12304100,
          },
        },
      ],
    });

    adapterInv = await Investments.new();
    adapterBal = await Balances.new();
  });

  it("should get correct token balances", async function () {
    const balances = await adapterBal.getBalances(TOKENS, WALLET);

    balances.map((i, k) => {
      console.log(NAMES[k], convertToDec(i, NAMES[k]));
    });
  });

  it("should get correct protocol investments", async function () {
    const balances = await adapterInv.getBalances(TOKENS, WALLET);

    balances.map(({ dydx, compound, aave, aaveV2 }, k) => {
      console.log(
        NAMES[k],
        "dYdX",
        convertToDec(dydx, NAMES[k]),
        "Compound",
        convertToDec(compound, NAMES[k]),
        "Aave",
        convertToDec(aave, NAMES[k]),
        "AaveV2",
        convertToDec(aave, NAMES[k])
      );
    });
  });
});
