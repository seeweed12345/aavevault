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

contract("Smart Wallet", ([multisig, alice, bob, charlie]) => {
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
    await registry.deployWallet({ from: alice });
    const swAddress = await registry.wallets(alice);
    wallet = await SmartWallet.at(swAddress);
  });

  it("should be able to receive ERC721 tokens", async function () {
    await erc721.safeTransferFrom(NFT_HOLDER, wallet.address, TOKEN_ID, {
      from: NFT_HOLDER,
    });

    const owner = await erc721.ownerOf(TOKEN_ID);
    assert.equal(owner, wallet.address);
  });

  it("should be able to send out ERC721 tokens", async function () {
    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "transferERC721",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "erc721",
          },
          {
            type: "address",
            name: "recipient",
          },
          {
            type: "uint256",
            name: "tokenId",
          },
        ],
      },
      [HASHMASKS, bob, TOKEN_ID]
    );

    const tx = await wallet.execute([nftTransfers.address], [data], false, {
      from: alice,
      gas: web3.utils.toHex(5e6),
    });
    console.log("\tGas Used:", tx.receipt.gasUsed);

    const owner = await erc721.ownerOf(TOKEN_ID);
    assert.equal(owner, bob);
  });

  it("should be able to approve ERC721 operator", async function () {
    // send back token for testing approvals
    await erc721.safeTransferFrom(bob, wallet.address, TOKEN_ID, {
      from: bob,
    });

    const data = web3.eth.abi.encodeFunctionCall(
      {
        name: "setApprovalERC721",
        type: "function",
        inputs: [
          {
            type: "address",
            name: "erc721",
          },
          {
            type: "address",
            name: "to",
          },
          {
            type: "bool",
            name: "status",
          },
        ],
      },
      [HASHMASKS, bob, true]
    );

    const tx = await wallet.execute([nftTransfers.address], [data], false, {
      from: alice,
      gas: web3.utils.toHex(5e6),
    });
    console.log("\tGas Used:", tx.receipt.gasUsed);

    const isApprovedForAll = await erc721.isApprovedForAll(wallet.address, bob);
    assert(isApprovedForAll);

    // Token transfered out of smart wallet
    await erc721.safeTransferFrom(wallet.address, charlie, TOKEN_ID, {
      from: bob, /// operator
    });

    // New token owner.
    const owner = await erc721.ownerOf(TOKEN_ID);
    assert.equal(owner, charlie);
  });
});
