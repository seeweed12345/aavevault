require("dotenv").config();
const Web3 = require("web3");
const web3 = new Web3(process.env.NODE_URL);

// PARAMS
// const MINT_CHI_TOKENS = true;
const MINT_CHI_TOKENS = false;
// const CREATE_WALLET = true;
const CREATE_WALLET = false;
const NET_ID = "666";

const registryArt = require("../registry.json");

const smartWalletArt = require("../build/contracts/SmartWallet.json");
const transferArt = require("../build/contracts/TransferLogic.json");
const compoundArt = require("../build/contracts/CompoundLogic.json");
const curveArt = require("../build/contracts/CurveLogic.json");
const gasTokenArt = require("../build/contracts/IGasToken.json");
const erc20Abi = require("./abis/erc20");
const cTokenAbi = require("./abis/cToken");

// Addresses
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const CUSDC = "0x39AA39c021dfbaE8faC545936693aC917d5E7563";
const GAS_TOKENS = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c"; // CHI

// Contract Instances
const registry = new web3.eth.Contract(registryArt.abi, registryArt.address);
const gasTokens = new web3.eth.Contract(gasTokenArt.abi, GAS_TOKENS);
const cUsdcContract = new web3.eth.Contract(cTokenAbi, CUSDC);
const daiContract = new web3.eth.Contract(erc20Abi, DAI);
const usdcContract = new web3.eth.Contract(erc20Abi, USDC);

const holderDAI = "0x9eB7f2591ED42dEe9315b6e2AAF21bA85EA69F8C";

let wallet, smartWallet, walletAddress, initialChi;

const walletCreation = async () => {
  console.log("Creating Smart Wallet...");
  const tx = await registry.methods
    .deployWallet()
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);

  walletAddress = await registry.methods.wallets(wallet).call();
  console.log("Smart Wallet Created!:", walletAddress);
};

const mintGasTokens = async () => {
  console.log("\nMinting 100 CHI Tokens...");
  await gasTokens.methods
    .mint(100)
    .send({ from: wallet, gas: web3.utils.toHex(6e6) });
  initialChi = await gasTokens.methods.balanceOf(wallet).call();
  console.log("User CHI Tokens balance", initialChi);

  console.log("Approving SW to spend CHI tokens...");
  await gasTokens.methods
    .approve(walletAddress, 100)
    .send({ from: wallet, gas: web3.utils.toHex(6e6) });
};

const checkBalance = async () => {
  let balance = await web3.eth.getBalance(walletAddress);
  console.log(`SW ETH balance: `, +web3.utils.fromWei(balance));

  balance = await daiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW DAI balance: `, +web3.utils.fromWei(balance));

  balance = await usdcContract.methods.balanceOf(walletAddress).call();
  console.log(`SW USDC balance: `, +balance / 1e6);
};

const deposit = async () => {
  console.log("\nDepositing 200 DAI");

  await daiContract.methods
    .approve(walletAddress, web3.utils.toWei("500"))
    .send({ from: wallet });

  const depositEncode = web3.eth.abi.encodeFunctionCall(
    {
      name: "deposit",
      type: "function",
      inputs: [
        {
          type: "address",
          name: "erc20",
        },
        {
          type: "uint256",
          name: "amount",
        },
      ],
    },
    [DAI, String(200e18)]
  );

  const transferAddress = transferArt.networks[NET_ID].address;

  let tx = await smartWallet.methods
    .execute([transferAddress], [depositEncode])
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
};

const supply = async () => {
  // Swap 200 DAI for USDC
  const data1 = web3.eth.abi.encodeFunctionCall(
    {
      name: "swapOnCurveSynth",
      type: "function",
      inputs: [
        {
          type: "address",
          name: "src",
        },
        {
          type: "address",
          name: "dest",
        },
        {
          type: "uint256",
          name: "srcAmt",
        },
      ],
    },
    [DAI, USDC, web3.utils.toWei("200")]
  );

  // Supply USDC to Compound
  const data2 = web3.eth.abi.encodeFunctionCall(
    {
      name: "mintCToken",
      type: "function",
      inputs: [
        {
          type: "address",
          name: "erc20",
        },
        {
          type: "address",
          name: "cErc20",
        },
        {
          type: "uint256",
          name: "tokenAmt",
        },
      ],
    },
    [USDC, CUSDC, String(100e6)]
  );

  console.log("\nSupplying USDC using DAI...");
  const tx = await smartWallet.methods
    .execute(
      [curveArt.networks[NET_ID].address, compoundArt.networks[NET_ID].address],
      [data1, data2]
    )
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);

  let balance = await cUsdcContract.methods
    .balanceOfUnderlying(walletAddress)
    .call();
  console.log(`SW USDC invested in Compound: `, +balance / 1e6);
};

const start = async () => {
  try {
    const accounts = await web3.eth.getAccounts();
    wallet = accounts[0];

    // INITIALIZE
    if (CREATE_WALLET) await walletCreation();
    walletAddress = await registry.methods.wallets(wallet).call();
    smartWallet = new web3.eth.Contract(smartWalletArt.abi, walletAddress);
    if (MINT_CHI_TOKENS) await mintGasTokens();
    await daiContract.methods
      .transfer(wallet, web3.utils.toWei("500"))
      .send({ from: holderDAI });

    // DEPOSITS
    await deposit();
    await checkBalance();

    // SUPPLY
    await supply();
    await checkBalance();

    let balanceGasTokens = await gasTokens.methods.balanceOf(wallet).call();
    console.log("Final User CHI Balance: ", balanceGasTokens + "\n\n");
  } catch (error) {
    console.log(error.message);
  }
};

start();
