require("dotenv").config();
const Web3 = require("web3");
const web3 = new Web3(process.env.NODE_URL);

// PARAMS
const MINT_CHI_TOKENS = false;
const BURN_CHI_TOKENS = false;
const CREATE_WALLET = true;
const NET_ID = "666";

const log = require("./excel");

const registryArt = require("../registry.json");

const smartWalletArt = require("../build/contracts/SmartWallet.json");
const compoundArt = require("../build/contracts/CompoundLogic.json");
const aaveArt = require("../build/contracts/AaveLogic.json");
const dydxArt = require("../build/contracts/DyDxLogic.json");
const transferArt = require("../build/contracts/TransferLogic.json");
const soloArt = require("../build/contracts/ISoloMargin.json");
const gasTokenArt = require("../build/contracts/IGasToken.json");
const erc20Abi = require("./abis/erc20");
const cTokenAbi = require("./abis/cToken");

// Addresses
const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const CETH = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5";
const AETH = "0x3a3A65aAb0dd2A17E3F1947bA16138cd37d08c04";
const SOLO_MARGIN = "0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e";
const GAS_TOKENS = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c"; // CHI
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// Contract Instances
const registry = new web3.eth.Contract(registryArt.abi, registryArt.address);
const gasTokens = new web3.eth.Contract(gasTokenArt.abi, GAS_TOKENS);
const cEthContract = new web3.eth.Contract(cTokenAbi, CETH);
const aEthContract = new web3.eth.Contract(erc20Abi, AETH);
const soloMargin = new web3.eth.Contract(soloArt.abi, SOLO_MARGIN);

let wallet,
  smartWallet,
  walletAddress,
  feeRecipient,
  initialChi,
  row = 2;

const walletCreation = async () => {
  console.log("Creating Smart Wallet...");
  const tx = await registry.methods
    .deployWallet()
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
  log("Wallet creation", tx.gasUsed, row++);

  walletAddress = await registry.methods.wallets(wallet).call();
  console.log("Smart Wallet Created!:", walletAddress);
};

const mintGasTokens = async () => {
  console.log("\nMinting CHI Tokens...");
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
};

const deposit = async () => {
  console.log("\nDepositing 10 ETH");

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
    [ethAddress, String(10e18)]
  );

  const transferAddress = transferArt.networks[NET_ID].address;

  let tx = await smartWallet.methods
    .execute([transferAddress], [depositEncode], BURN_CHI_TOKENS)
    .send({ from: wallet, gas: web3.utils.toHex(5e6), value: String(10e18) });

  console.log("Gas Used:", tx.gasUsed);
  log("Depositing ETH to SW", tx.gasUsed, row++);
};

const withdraw = async () => {
  console.log("\nWithdrawing 1 ETH from SW");

  let data = web3.eth.abi.encodeFunctionCall(
    {
      name: "withdraw",
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
    [ethAddress, String(1e18)]
  );
  let tx = await smartWallet.methods
    .execute([transferArt.networks[NET_ID].address], [data], BURN_CHI_TOKENS)
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
  log("Withdrawing ETH from SW", tx.gasUsed, row++);
};

const supplyMultipleETH = async () => {
  const data1 = web3.eth.abi.encodeFunctionCall(
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
    [ethAddress, CETH, String(1e18)]
  );

  const data2 = web3.eth.abi.encodeFunctionCall(
    {
      name: "mintAToken",
      type: "function",
      inputs: [
        {
          type: "address",
          name: "erc20",
        },
        {
          type: "uint256",
          name: "tokenAmt",
        },
      ],
    },
    [ethAddress, String(1e18)]
  );

  const data3 = web3.eth.abi.encodeFunctionCall(
    {
      name: "deposit",
      type: "function",
      inputs: [
        {
          type: "uint256",
          name: "marketId",
        },
        {
          type: "address",
          name: "erc20Addr",
        },
        {
          type: "uint256",
          name: "tokenAmt",
        },
      ],
    },
    [0, ethAddress, String(1e18)]
  );

  console.log("\nSupplying 1 ETH to each Protocol...");
  const tx = await smartWallet.methods
    .execute(
      [
        compoundArt.networks[NET_ID].address,
        aaveArt.networks[NET_ID].address,
        dydxArt.networks[NET_ID].address,
      ],
      [data1, data2, data3],
      BURN_CHI_TOKENS
    )
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
  log("Multiple Supply of ETH", tx.gasUsed, row++);

  let balance = await cEthContract.methods
    .balanceOfUnderlying(walletAddress)
    .call();
  console.log(`SW invested ETH in Compound: `, +web3.utils.fromWei(balance));

  balance = await aEthContract.methods.balanceOf(walletAddress).call();
  console.log(`SW invested ETH in Aave: `, +web3.utils.fromWei(balance));

  let accountWei = await soloMargin.methods
    .getAccountWei([walletAddress, 0], 0)
    .call();
  balance = accountWei.value;
  console.log("SW invested ETH in DyDx:", +web3.utils.fromWei(balance));
};

const redeemMultipleETH = async () => {
  const data1 = web3.eth.abi.encodeFunctionCall(
    {
      name: "redeemUnderlying",
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
    [ethAddress, CETH, String(1e18)]
  );

  const data2 = web3.eth.abi.encodeFunctionCall(
    {
      name: "redeemAToken",
      type: "function",
      inputs: [
        {
          type: "address",
          name: "erc20",
        },
        {
          type: "uint256",
          name: "tokenAmt",
        },
      ],
    },
    [AETH, String(1e18)]
  );

  const data3 = web3.eth.abi.encodeFunctionCall(
    {
      name: "withdraw",
      type: "function",
      inputs: [
        {
          type: "uint256",
          name: "marketId",
        },
        {
          type: "address",
          name: "erc20Addr",
        },
        {
          type: "uint256",
          name: "tokenAmt",
        },
      ],
    },
    [0, WETH, String(1e18)]
  );

  console.log("\nRedeeming 1 ETH from each Protocol...");
  const tx = await smartWallet.methods
    .execute(
      [
        compoundArt.networks["666"].address,
        aaveArt.networks["666"].address,
        dydxArt.networks["666"].address,
      ],
      [data1, data2, data3],
      BURN_CHI_TOKENS
    )
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });
  console.log("Gas Used:", tx.gasUsed);
  log("Redeem Multiple ETH", tx.gasUsed, row++);

  let balance = await cEthContract.methods
    .balanceOfUnderlying(walletAddress)
    .call();
  console.log(`SW invested ETH in Compound: `, +web3.utils.fromWei(balance));

  balance = await aEthContract.methods.balanceOf(walletAddress).call();
  console.log(`SW invested ETH in Aave: `, +web3.utils.fromWei(balance));

  let accountWei = await soloMargin.methods
    .getAccountWei([walletAddress, 0], 0)
    .call();
  balance = accountWei.value;
  console.log("SW invested ETH in DyDx:", +web3.utils.fromWei(balance));
};

const start = async () => {
  try {
    const accounts = await web3.eth.getAccounts();
    wallet = accounts[0];

    // INITIALIZE

    if (CREATE_WALLET) await walletCreation();

    walletAddress = await registry.methods.wallets(wallet).call();
    feeRecipient = await registry.methods.feeRecipient().call();
    smartWallet = new web3.eth.Contract(smartWalletArt.abi, walletAddress);

    const feeRecipientBal = await web3.eth.getBalance(feeRecipient);
    console.log("Initial Fee Recipient Balance: ", +web3.utils.fromWei(feeRecipientBal))

    if (MINT_CHI_TOKENS) await mintGasTokens();

    // DEPOSITS
    await deposit();
    await checkBalance();

    // WITHDRAWS
    await withdraw();
    await checkBalance();

    // SUPPLY
    await supplyMultipleETH();

    // REDEEM
    await redeemMultipleETH();

    // GAS TOKENS
    let balanceGasTokens = await gasTokens.methods.balanceOf(wallet).call();
    console.log("Final User CHI Balance: ", balanceGasTokens + "\n\n");

    // FEES
    const feeRecipientBal2 = await web3.eth.getBalance(feeRecipient);
    console.log("Final Fee Recipient Balance: ", +web3.utils.fromWei(feeRecipientBal2))
  } catch (error) {
    console.log(error.message);
  }
};

start();
