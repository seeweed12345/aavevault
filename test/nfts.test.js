const EthaRegistryTruffle = artifacts.require("EthaRegistry");
const SmartWallet = artifacts.require("SmartWallet");
const TransferNFTLogic = artifacts.require("TransferNFTLogic");
const IERC721 = artifacts.require("IERC721");
const IERC1155 = artifacts.require("IERC1155");

const { assert } = require("hardhat");
const hre = require("hardhat");

const FEE = 1000;

// ERC721
const TOKEN_ID = 10260;
const NFT_HOLDER = "0xc72aed14386158960d0e93fecb83642e68482e4b";
const HASHMASKS = "0xc2c747e0f7004f9e8817db2ca4997657a7746928";

contract("Smart Wallet", ([multisig, user]) => {
  let registry, wallet, nftTransfers, erc721;

  before(async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [NFT_HOLDER],
    });

    erc721 = await IERC721.at(HASHMASKS);

    const EthaRegistry = await ethers.getContractFactory("EthaRegistry");

    nftTransfers = await TransferNFTLogic.new();
    smartWalletImpl = await SmartWallet.new();

    const proxy = await upgrades.deployProxy(EthaRegistry, [
      smartWalletImpl.address,
      multisig,
      multisig,
      FEE,
    ]);

    registry = await EthaRegistryTruffle.at(proxy.address);

    await registry.enableLogicMultiple([nftTransfers.address]);
    await registry.deployWallet({ from: user });
    const swAddress = await registry.wallets(user);
    wallet = await SmartWallet.at(swAddress);
  });

  it("should be able to receive ERC721 tokens", async function () {
    await erc721.safeTransferFrom(NFT_HOLDER, wallet.address, TOKEN_ID, {
      from: NFT_HOLDER,
    });

    const owner = await erc721.ownerOf(TOKEN_ID);
    assert.equal(owner, wallet.address);
  });
});
