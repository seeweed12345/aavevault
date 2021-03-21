// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract TransfersNFTLogic {

    /**
     * @dev set Approvals for ERC721
     */
    function setApprovalERC721(IERC721 erc721, address to, bool status) external {
        erc721.setApprovalForAll(to, status);
    }

    /**
     * @dev set Approvals for ERC1155
     */
    function setApprovalERC1155(IERC1155 erc1155, address to, bool status) external {
        erc1155.setApprovalForAll(to, status);
    }

    /**
     * @dev Transfer ERC721 token to recipient
     */
    function transferERC721(
        IERC721 erc721,
        address recipient,
        uint256 tokenId
    ) external payable {
        erc721.safeTransferFrom(address(this), recipient, tokenId, "0x0");
    }

    /**
     * @dev Transfer ERC1155 token to recipient
     */
    function transferERC1155(
        IERC1155 erc1155,
        address recipient,
        uint256 tokenId,
        uint256 quantity
    ) external payable {
        erc1155.safeTransferFrom(
            address(this),
            recipient,
            tokenId,
            quantity,
            "0x0"
        );
    }

    /**
     * @dev Batch Transfer ERC1155 tokens to recipient
     */
    function transferERC1155(
        IERC1155 erc1155,
        address recipient,
        uint256[] calldata tokenIds,
        uint256[] calldata quantities
    ) external payable {
        erc1155.safeBatchTransferFrom(
            address(this),
            recipient,
            tokenIds,
            quantities,
            "0x0"
        );
    }
}