require("dotenv").config();
const Web3 = require("web3");
const web3 = new Web3(process.env.NODE_URL);
const web3Mainnet = new Web3(process.env.MAINNET_NODE_URL);

const log = require("./excel");

const registryArt = require("../registry.json");

const compoundArt = require("../build/contracts/CompoundLogic.json");
const aaveArt = require("../build/contracts/AaveLogic.json");
const dydxArt = require("../build/contracts/DyDxLogic.json");
const soloArt = require("../build/contracts/SoloMarginContract.json");
const kyberArt = require("../build/contracts/KyberLogic.json");
const oneSplitArt = require("../build/contracts/I1split.json");
const curveArt = require("../build/contracts/CurveLogic.json");
const transferArt = require("../build/contracts/TransferLogic.json");
const smartWalletArt = require("../build/contracts/SmartWallet.json");

const erc20Abi = require("./abis/erc20");
const gasTokenAbi = require("./abis/gasTokens");

// Addresses
const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const CDAI = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
const CUSDC = "0x39AA39c021dfbaE8faC545936693aC917d5E7563";
const CETH = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5";
const ADAI = "0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d";
const AUSDC = "0x9bA00D6856a4eDF4665BcA2C2309936572473B7E";
const AETH = "0x3a3A65aAb0dd2A17E3F1947bA16138cd37d08c04";
const SOLO_MARGIN = "0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e";
const ONE_SPLIT_ADDRESS = "0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E";
const GAS_TOKENS = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c"; // CHI

const holderDAI = "0x5921c191fe58175B1fb8943ED3F17345e615fF02"; // holder of DAI in mainnet
const holderUSDC = "0x41318419CFa25396b47A94896FfA2C77c6434040"; // holder of USDC in mainnet

// Contract Instances
const registry = new web3.eth.Contract(registryArt.abi, registryArt.address);
const usdcContract = new web3.eth.Contract(erc20Abi, usdcAddress);
const daiContract = new web3.eth.Contract(erc20Abi, daiAddress);
const cDaiContract = new web3.eth.Contract(erc20Abi, CDAI);
const aDaiContract = new web3.eth.Contract(erc20Abi, ADAI);
const cEthContract = new web3.eth.Contract(erc20Abi, CETH);
const aEthContract = new web3.eth.Contract(erc20Abi, AETH);
const cUsdcContract = new web3.eth.Contract(erc20Abi, CUSDC);
const aUsdcContract = new web3.eth.Contract(erc20Abi, AUSDC);
const soloMargin = new web3.eth.Contract(soloArt.abi, SOLO_MARGIN);
const gasTokens = new web3.eth.Contract(gasTokenAbi, GAS_TOKENS);
const curve = new web3.eth.Contract(
  curveArt.abi,
  curveArt.networks["666"].address
);

//MAINNET INSTANCES
const oneSplitMainnet = new web3Mainnet.eth.Contract(
  oneSplitArt.abi,
  ONE_SPLIT_ADDRESS
);

const kyberMainnet = new web3Mainnet.eth.Contract(
  kyberArt.abi,
  kyberArt.networks["666"].address
);

let wallet,
  smartWallet,
  walletAddress,
  row = 2;

const toDec = (hex) => web3.utils.toDecimal(hex);

const DISABLED_FLAGS =
  toDec("0x01") + // Uniswap
  toDec("0x02") + // Kyber
  toDec("0x04") + // Bancor
  toDec("0x08") + // Oasis
  toDec("0x1000000") + // Mooniswap
  toDec("0x2000000") + // Uniswap V2 ALL
  toDec("0x4000000000"); // DForce

const oneSplitDexes = [
  "Uniswap",
  "Kyber",
  "Bancor",
  "Oasis",
  "Curve Compound",
  "Curve USDT",
  "Curve Y",
  "Curve Binance",
  "Curve Synthetix",
  "Uniswap Compound",
  "Uniswap CHAI",
  "Uniswap Aave",
  "Mooniswap",
  "Uniswap V2",
  "Uniswap V2 ETH",
  "Uniswap V2 DAI",
  "Uniswap V2 USDC",
  "Curve Pax",
  "Curve renBTC",
  "Curve tBTC",
  "Dforce XSwap",
  "Shell",
  "mStable mUSD",
];

const MINT_GAS_TOKENS = true;
const BURN_CHI = true;
const FEE_RECIPIENT = "0x5eb3314125D201644c03B79F6aE6d299d39abfd0";

function timeout(s) {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}

const mintTokens = async () => {
  console.log("Minting 1000 DAI to user");
  await daiContract.methods
    .transfer(wallet, web3.utils.toWei("1000"))
    .send({ from: holderDAI });

  balance = await daiContract.methods.balanceOf(wallet).call();
  console.log(`User DAI balance: `, +web3.utils.fromWei(balance));

  const amt = new web3.utils.BN(1000e6);

  console.log("Minting 1000 USDC to user");

  await usdcContract.methods
    .transfer(wallet, amt.toString())
    .send({ from: holderUSDC, gas: web3.utils.toHex(200000) });

  balance = await usdcContract.methods.balanceOf(wallet).call();
  console.log(`User USDC balance: `, +balance / 10 ** 6);
};

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

const checkBalance = async (address) => {
  let balance = await web3.eth.getBalance(address);
  console.log(`SW ETH balance: `, +web3.utils.fromWei(balance));

  balance = await daiContract.methods.balanceOf(address).call();
  console.log(`SW DAI balance: `, +web3.utils.fromWei(balance));

  balance = await usdcContract.methods.balanceOf(address).call();
  console.log(`SW USDC balance: `, +balance / 10 ** 6);
};

const deposit = async () => {
  console.log("\nDepositing 5 ETH");
  let data = web3.eth.abi.encodeFunctionCall(
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
    [ethAddress, String(5e18)]
  );
  let tx = await smartWallet.methods
    .execute([transferArt.networks["666"].address], [data], BURN_CHI)
    .send({ from: wallet, gas: web3.utils.toHex(5e6), value: String(5e18) });

  console.log("Gas Used:", tx.gasUsed);
  log("Depositing ETH to SW", tx.gasUsed, row++);

  console.log("Approving DAI spending to SW...");
  await daiContract.methods
    .approve(walletAddress, web3.utils.toWei("1000"))
    .send({ from: wallet });

  console.log("Depositing 100 DAI with function");
  data = web3.eth.abi.encodeFunctionCall(
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
    [daiAddress, String(100e18)]
  );
  tx = await smartWallet.methods
    .execute([transferArt.networks["666"].address], [data], BURN_CHI)
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
  log("Depositing ERC20 to SW", tx.gasUsed, row++);
  // await smartWallet.methods
  //   .deposit(daiAddress, String(100e18))
  //   .send({ from: wallet });

  console.log("Depositing 100 USDC with qr code");
  await usdcContract.methods
    .transfer(walletAddress, String(100e6))
    .send({ from: wallet });
};

const withdraw = async () => {
  console.log("\nWithdrawing 0.5 ETH from SW");

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
    [ethAddress, String(0.5e18)]
  );
  let tx = await smartWallet.methods
    .execute([transferArt.networks["666"].address], [data], BURN_CHI)
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
  log("Withdrawing ETH from SW", tx.gasUsed, row++);

  console.log("Withdrawing 50 DAI from SW");
  data = web3.eth.abi.encodeFunctionCall(
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
    [daiAddress, String(50e18)]
  );
  tx = await smartWallet.methods
    .execute([transferArt.networks["666"].address], [data], BURN_CHI)
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
  log("Withdrawing ERC20 from SW", tx.gasUsed, row++);
};

const supplyCompound = async () => {
  const data = web3.eth.abi.encodeFunctionCall(
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
    [daiAddress, CDAI, String(5e18)]
  );

  console.log("\nSupplying 5 DAI to Compound...");
  const tx = await smartWallet.methods
    .execute([compoundArt.networks["666"].address], [data], BURN_CHI)
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
  log("Supplying ERC20 to Compound", tx.gasUsed, row++);

  const balance = await cDaiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW cDAI balance: `, balance.toString());
};

const supplyAave = async () => {
  const data = web3.eth.abi.encodeFunctionCall(
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
    [daiAddress, String(5e18)]
  );

  console.log("Supplying 5 DAI to Aave...");
  const tx = await smartWallet.methods
    .execute([aaveArt.networks["666"].address], [data], BURN_CHI)
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
  log("Supplying ERC20 to Aave", tx.gasUsed, row++);

  const balance = await aDaiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW aDAI balance: `, +web3.utils.fromWei(balance));
};

const supplyDyDx = async () => {
  const data = web3.eth.abi.encodeFunctionCall(
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
    [3, daiAddress, String(5e18)]
  );

  console.log("Supplying 5 DAI to DyDx...");
  const tx = await smartWallet.methods
    .execute([dydxArt.networks["666"].address], [data], BURN_CHI)
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
  log("Supplying ERC20 to Dydx", tx.gasUsed, row++);

  let accountWei = await soloMargin.methods
    .getAccountWei([walletAddress, 0], 3)
    .call();
  const balance = accountWei.value;
  console.log("SW DAI invested in DyDx:", +web3.utils.fromWei(balance));
};

const supplyMultipleERC20 = async () => {
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
    [daiAddress, CDAI, String(10e18)]
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
    [daiAddress, String(10e18)]
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
    [3, daiAddress, String(10e18)]
  );

  console.log("\nSupplying 10 DAI to each Protocol...");
  const tx = await smartWallet.methods
    .execute(
      [
        compoundArt.networks["666"].address,
        aaveArt.networks["666"].address,
        dydxArt.networks["666"].address,
      ],
      [data1, data2, data3],
      BURN_CHI
    )
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
  log("Multiple Supply of ERC20", tx.gasUsed, row++);

  let balance = await cDaiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW cDAI balance: `, balance.toString());

  balance = await aDaiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW aDAI balance: `, +web3.utils.fromWei(balance));

  let accountWei = await soloMargin.methods
    .getAccountWei([walletAddress, 0], 3)
    .call();
  balance = accountWei.value;
  console.log("SW DAI invested in DyDx:", +web3.utils.fromWei(balance));
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
    [ethAddress, CETH, String(0.1e18)]
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
    [ethAddress, String(0.1e18)]
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
    [0, ethAddress, String(0.1e18)]
  );

  console.log("\nSupplying 0.1 ETH to each Protocol...");
  const tx = await smartWallet.methods
    .execute(
      [
        compoundArt.networks["666"].address,
        aaveArt.networks["666"].address,
        dydxArt.networks["666"].address,
      ],
      [data1, data2, data3],
      BURN_CHI
    )
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
  log("Multiple Supply of ETH", tx.gasUsed, row++);

  let balance = await cEthContract.methods.balanceOf(walletAddress).call();
  console.log(`SW cETH balance: `, balance.toString());

  balance = await aEthContract.methods.balanceOf(walletAddress).call();
  console.log(`SW aETH balance: `, +web3.utils.fromWei(balance));

  let accountWei = await soloMargin.methods
    .getAccountWei([walletAddress, 0], 0)
    .call();
  balance = accountWei.value;
  console.log("SW ETH invested in DyDx:", +web3.utils.fromWei(balance));
};

const supplyUsingETH = async () => {
  console.log("\nSupplying DAI using ETH");
  console.log("Checking Kyber expected rate...");
  const amount = web3.utils.toWei("1");
  const rate = await kyberMainnet.methods
    .getExpectedRate(ethAddress, daiAddress, amount)
    .call();

  console.log("Estimated DAI to supply: ", +web3.utils.fromWei(rate));

  const data1 = web3.eth.abi.encodeFunctionCall(
    {
      name: "swapKyber",
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
    [ethAddress, daiAddress, amount]
  );

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
    [daiAddress, CDAI, String(rate / 3)]
  );

  const data3 = web3.eth.abi.encodeFunctionCall(
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
    [daiAddress, String(rate / 3)]
  );

  const data4 = web3.eth.abi.encodeFunctionCall(
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
    [3, daiAddress, String(rate / 3)]
  );

  console.log(
    `Supplying ${+web3.utils.fromWei(
      String(rate / 3)
    )}(33.33%) of returned DAI from Kyber to each protocol...`
  );
  const tx = await smartWallet.methods
    .execute(
      [
        kyberArt.networks["666"].address,
        compoundArt.networks["666"].address,
        aaveArt.networks["666"].address,
        dydxArt.networks["666"].address,
      ],
      [data1, data2, data3, data4],
      BURN_CHI
    )
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });
  console.log("Gas Used:", tx.gasUsed);
  log("Supply ERC20 using ETH", tx.gasUsed, row++);

  let balance = await cDaiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW cDAI balance: `, balance.toString());

  balance = await aDaiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW aDAI balance: `, +web3.utils.fromWei(balance));

  let accountWei = await soloMargin.methods
    .getAccountWei([walletAddress, 0], 3)
    .call();
  balance = accountWei.value;
  console.log("SW DAI invested in DyDx:", +web3.utils.fromWei(balance));
};

const checkSupplyEventsDAI = async () => {
  const block = await web3.eth.getBlockNumber();
  const supplyEvents = await smartWallet.getPastEvents("LogMint", {
    fromBlock: block - 50,
    toBlock: "latest",
  });
  console.log("\nSupply Events DAI:");

  supplyEvents
    .filter((e) => e.returnValues.erc20 === daiAddress)
    .forEach(({ returnValues: r }) => {
      console.log(` => ${+web3.utils.fromWei(r.tokenAmt)} DAI`);
    });
};

const checkSupplyEventsETH = async () => {
  const block = await web3.eth.getBlockNumber();
  const supplyEvents = await smartWallet.getPastEvents("LogMint", {
    fromBlock: block - 50,
    toBlock: "latest",
  });

  console.log("\nSupply Events ETH:");

  supplyEvents
    .filter((e) => e.returnValues.erc20 === ethAddress)
    .forEach(({ returnValues: r }) => {
      console.log(` => ${+web3.utils.fromWei(r.tokenAmt)} ETH`);
    });
};

const redeemCompound = async () => {
  const data = web3.eth.abi.encodeFunctionCall(
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
    [daiAddress, CDAI, String(5e18)]
  );

  console.log("\nRedeeming 5 DAI from Compound...");
  const tx = await smartWallet.methods
    .execute([compoundArt.networks["666"].address], [data], BURN_CHI)
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });
  console.log("Gas Used:", tx.gasUsed);
  log("Redeem ERC20 Compound", tx.gasUsed, row++);

  const balance = await cDaiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW cDAI balance: `, balance.toString());
};

const redeemAave = async () => {
  const data = web3.eth.abi.encodeFunctionCall(
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
    [ADAI, String(5e18)]
  );

  console.log("Redeeming 5 DAI from Aave...");
  const tx = await smartWallet.methods
    .execute([aaveArt.networks["666"].address], [data], BURN_CHI)
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
  log("Redeem ERC20 Aave", tx.gasUsed, row++);

  const balance = await aDaiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW aDAI balance: `, +web3.utils.fromWei(balance));

  const feeBalance = await daiContract.methods
    .balanceOf("0x5eb3314125D201644c03B79F6aE6d299d39abfd0")
    .call();
  console.log(`Fee Recipient DAI balance: `, +web3.utils.fromWei(feeBalance));
};

const redeemAaveETH = async () => {
  const data = web3.eth.abi.encodeFunctionCall(
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
    [AETH, String(0.1e18)]
  );

  console.log("\nRedeeming 0.1 ETH from Aave...");
  const tx = await smartWallet.methods
    .execute([aaveArt.networks["666"].address], [data], BURN_CHI)
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  // console.log(tx);

  console.log("Gas Used:", tx.gasUsed);
  log("Redeem ETH Aave", tx.gasUsed, row++);

  const balance = await aDaiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW aDAI balance: `, +web3.utils.fromWei(balance));
};

const redeemDyDx = async () => {
  const data = web3.eth.abi.encodeFunctionCall(
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
    [3, daiAddress, String(5e18)]
  );

  console.log("\nRedeeming 5 DAI from DyDx...");
  const tx = await smartWallet.methods
    .execute([dydxArt.networks["666"].address], [data], BURN_CHI)
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  console.log("Gas Used:", tx.gasUsed);
  log("Redeem ERC20 Dydx", tx.gasUsed, row++);

  let accountWei = await soloMargin.methods
    .getAccountWei([walletAddress, 0], 3)
    .call();
  const balance = accountWei.value;
  console.log("SW DAI invested in DyDx:", +web3.utils.fromWei(balance));
};

const redeemDyDxETH = async () => {
  const data = web3.eth.abi.encodeFunctionCall(
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
    [0, wethAddress, String(0.05e18)]
  );

  console.log("\nRedeeming 0.05 ETH from DyDx...");
  const tx = await smartWallet.methods
    .execute([dydxArt.networks["666"].address], [data], BURN_CHI)
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });

  // console.log(tx);

  console.log("Gas Used:", tx.gasUsed);
  log("Redeem ETH Dydx", tx.gasUsed, row++);

  let accountWei = await soloMargin.methods
    .getAccountWei([walletAddress, 0], 3)
    .call();
  const balance = accountWei.value;
  console.log("SW DAI invested in DyDx:", +web3.utils.fromWei(balance));
};

const redeemMultipleERC20 = async () => {
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
    [daiAddress, CDAI, String(5e18)]
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
    [ADAI, String(5e18)]
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
    [3, daiAddress, String(5e18)]
  );

  console.log("\nRedeeming 5 DAI from each Protocol...");
  const tx = await smartWallet.methods
    .execute(
      [
        compoundArt.networks["666"].address,
        aaveArt.networks["666"].address,
        dydxArt.networks["666"].address,
      ],
      [data1, data2, data3],
      BURN_CHI
    )
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });
  console.log("Gas Used:", tx.gasUsed);
  log("Redeem Multiple ERC20", tx.gasUsed, row++);

  let balance = await cDaiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW cDAI balance: `, balance.toString());

  balance = await aDaiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW aDAI balance: `, +web3.utils.fromWei(balance));

  let accountWei = await soloMargin.methods
    .getAccountWei([walletAddress, 0], 3)
    .call();
  balance = accountWei.value;
  console.log("SW DAI invested in DyDx:", +web3.utils.fromWei(balance));
};

const checkRedeemEventsDAI = async () => {
  const block = await web3.eth.getBlockNumber();
  const supplyEvents = await smartWallet.getPastEvents("LogRedeem", {
    fromBlock: block - 50,
    toBlock: "latest",
  });
  console.log("\nRedeem Events DAI:");

  supplyEvents
    .filter((e) => e.returnValues.erc20 === daiAddress)
    .forEach(({ returnValues: r }) => {
      console.log(` => ${+web3.utils.fromWei(r.tokenAmt)} DAI`);
    });
};

const checkRedeemEventsETH = async () => {
  const block = await web3.eth.getBlockNumber();
  const supplyEvents = await smartWallet.getPastEvents("LogRedeem", {
    fromBlock: block - 50,
    toBlock: "latest",
  });

  console.log("\nRedeem Events ETH:");

  supplyEvents
    .filter((e) => e.returnValues.erc20 === ethAddress)
    .forEach(({ returnValues: r }) => {
      console.log(` => ${+web3.utils.fromWei(r.tokenAmt)} ETH`);
    });
};

const rebalanceDAIUSDC = async () => {
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
    [daiAddress, CDAI, String(3e18)]
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
    [ADAI, String(3e18)]
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
    [3, daiAddress, String(3e18)]
  );

  console.log("\nChecking 1Inch expected rate for 9 DAI...");
  const amount = web3.utils.toWei("9");
  const {
    returnAmount,
    distribution,
  } = await oneSplitMainnet.methods
    .getExpectedReturn(daiAddress, usdcAddress, amount, 1, DISABLED_FLAGS)
    .call();

  console.log("Estimated total USDC to supply: ", +returnAmount / 10 ** 6);

  let curvePool;
  distribution.map((i, k) => {
    if (parseFloat(i) > 0) {
      if (oneSplitDexes[k] === "Curve USDT") curvePool = "swapOnCurveUSDT";
      if (oneSplitDexes[k] === "Curve Y") curvePool = "swapOnCurveY";
      if (oneSplitDexes[k] === "Curve Compound")
        curvePool = "swapOnCurveCompound";
      if (oneSplitDexes[k] === "Curve Synthetix")
        curvePool = "swapOnCurveSynth";
      if (oneSplitDexes[k] === "Curve Pax") curvePool = "swapOnCurvePAX";
      console.log(oneSplitDexes[k], parseFloat(i));
    }
  });

  console.log(curvePool);

  const supplyAmount = Math.floor(returnAmount / 3);

  console.log(`Supplying ${+supplyAmount / 10 ** 6} USDC to each protocol...`);

  const data4 = web3.eth.abi.encodeFunctionCall(
    {
      name: curvePool,
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
    [daiAddress, usdcAddress, amount]
  );

  const data5 = web3.eth.abi.encodeFunctionCall(
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
    [usdcAddress, CUSDC, supplyAmount]
  );

  const data6 = web3.eth.abi.encodeFunctionCall(
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
    [usdcAddress, supplyAmount]
  );

  const data7 = web3.eth.abi.encodeFunctionCall(
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
    [2, usdcAddress, supplyAmount]
  );

  console.log(
    "Redeeming 3 DAI from each Protocol, exchanging for USDC and supplying equally to protocols..."
  );

  const tx = await smartWallet.methods
    .execute(
      [
        compoundArt.networks["666"].address,
        aaveArt.networks["666"].address,
        dydxArt.networks["666"].address,
        curveArt.networks["666"].address,
        compoundArt.networks["666"].address,
        aaveArt.networks["666"].address,
        dydxArt.networks["666"].address,
      ],
      [data1, data2, data3, data4, data5, data6, data7],
      BURN_CHI
    )
    .send({ from: wallet, gas: web3.utils.toHex(5e6) });
  console.log("Gas Used:", tx.gasUsed);
  log("Rebalance ERC20", tx.gasUsed, row++);

  let balance = await cDaiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW cDAI balance: `, balance.toString());

  balance = await aDaiContract.methods.balanceOf(walletAddress).call();
  console.log(`SW aDAI balance: `, +web3.utils.fromWei(balance));

  let accountWei = await soloMargin.methods
    .getAccountWei([walletAddress, 0], 3)
    .call();
  balance = accountWei.value;
  console.log("SW DAI invested in DyDx:", +web3.utils.fromWei(balance));

  let balance2 = await cUsdcContract.methods.balanceOf(walletAddress).call();
  console.log(`SW cUSDC balance: `, balance2.toString());

  balance2 = await aUsdcContract.methods.balanceOf(walletAddress).call();
  console.log(`SW aUSDC balance: `, +balance2 / 10 ** 6);

  let accountWei2 = await soloMargin.methods
    .getAccountWei([walletAddress, 0], 2)
    .call();
  balance2 = accountWei2.value;
  console.log("SW USDC invested in DyDx:", +balance2 / 10 ** 6);
};

const start = async () => {
  try {
    const accounts = await web3.eth.getAccounts();
    wallet = accounts[0];

    console.log("\nFee Recipient Balances:");
    await checkBalance(FEE_RECIPIENT);

    // INITIALIZE
    await mintTokens();
    await walletCreation();

    walletAddress = await registry.methods.wallets(wallet).call();
    smartWallet = new web3.eth.Contract(smartWalletArt.abi, walletAddress);

    if (MINT_GAS_TOKENS) await mintGasTokens();

    // DEPOSITS
    await deposit();
    await checkBalance(walletAddress);

    // WITHDRAWS
    await withdraw();
    await checkBalance(walletAddress);

    // SUPPLY
    await supplyCompound();
    await supplyAave();
    await supplyDyDx();
    await supplyMultipleERC20();
    await supplyMultipleETH();
    // await supplyUsingETH();
    await checkBalance(walletAddress);

    // REDEEM
    await redeemAaveETH();
    await redeemDyDxETH();
    await redeemCompound();
    await redeemAave();
    await redeemDyDx();
    await redeemMultipleERC20();

    // REBALANCE
    await rebalanceDAIUSDC();

    // EVENTS
    await checkSupplyEventsDAI();
    await checkSupplyEventsETH();
    await checkRedeemEventsDAI();
    await checkRedeemEventsETH();

    console.log("\nFee Recipient Final Balances:");
    await checkBalance(FEE_RECIPIENT);
  } catch (error) {
    console.log(error.message);
  }
};

start();
