require("dotenv").config();
const Web3 = require("web3");
const web3 = new Web3(process.env.NODE_URL);

const erc20Abi = require("./abis/erc20");

const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const daiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";

const holderDAI = "0x78Bc49be7bae5e0eeC08780c86F0e8278B8B035b"; // holder of DAI in mainnet
const holderUSDC = "0x0434dEeD9E80e047579F6f384Cc3834351C2B555"; // holder of USDC in mainnet

const usdcContract = new web3.eth.Contract(erc20Abi, usdcAddress);
const daiContract = new web3.eth.Contract(erc20Abi, daiAddress);

const execute = async () => {
  const accounts = await web3.eth.getAccounts();
  const wallet = accounts[0];

  const users = ["0x0fc1Fb5Eb6f1F1D17507F08eDB5807B66C705F5e", "0xB29aE9a9BF7CA2984a6a09939e49d9Cf46AB0c1d"]

  users.forEach(async(user) => {
    await web3.eth.sendTransaction({
      from: wallet,
      gasLimit: web3.utils.toHex(50000),
      to: user,
      value: web3.utils.toWei("5"),
    });
  
    let balance = await web3.eth.getBalance(user);
    console.log(`User ETH balance: `, web3.utils.fromWei(balance));
  
    await daiContract.methods
      .transfer(user, web3.utils.toWei("1000"))
      .send({ from: holderDAI });
  
    balance = await daiContract.methods.balanceOf(user).call();
    console.log(`User DAI balance: `, web3.utils.fromWei(balance));
  
    const amt = new web3.utils.BN(1000e6);
  
    await usdcContract.methods
      .transfer(user, amt.toString())
      .send({ from: holderUSDC });
  
    balance = await usdcContract.methods.balanceOf(user).call();
    console.log(`User USDC balance: `, +balance / 10 ** 6);
  });
  
};

execute();
