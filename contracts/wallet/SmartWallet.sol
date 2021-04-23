//SPDX-License-Identifier: MIT
pragma solidity 0.7.3;
pragma experimental ABIEncoderV2;

import "../interfaces/IRegistry.sol";
import "../interfaces/IGasToken.sol";
import "../interfaces/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title Registry related helper functions
 */
contract RegistryHelper {  

    /**
     * @dev address registry of system, stores logic and wallet addresses
     */
    address public registry;

    /**
     * @dev Throws if the logic is not authorised
     */
    modifier logicAuth(address logicAddr) {
        require(logicAddr != address(0), "logic-proxy-address-required");
        require(IRegistry(registry).logic(logicAddr), "logic-not-authorised");
        _;
    }
}

/**
 * @title User Auth
 */
contract UserAuth is RegistryHelper {

    address public owner;

    /**
     * @dev store allowed addresses to use the smart wallet
     */
    mapping(address => bool) public isDelegate;

    /**
     * @dev store user's transaction count
     */
    uint public nonce;

    /**
     * @dev emit events when delegates added/removed
     */
    event DelegateAdded(address delegate);  
    event DelegateRemoved(address delegate);  

    /**
     * @dev Checks if called by owner or contract itself
     */
    modifier auth {
        require(
            isDelegate[msg.sender] || msg.sender == address(this) || msg.sender == owner,
            "permission-denied"
        );
        _;
    }

    /**
     * @dev Adds a new address that can control the smart wallet
     */
    function addDelegate(address _delegate) external {
        require(msg.sender == owner, "ONLY-OWNER");
        require(_delegate != address(0x0), "ZERO-ADDRESS");
        isDelegate[_delegate] = true;

        emit DelegateAdded(_delegate);
    }

    /**
     * @dev Remove an existing address that can control the smart wallet
     */
    function removeDelegate(address _delegate) external {
        require(msg.sender == owner, "ONLY-OWNER");
        require(isDelegate[_delegate], "NOT_DELEGATE");
        isDelegate[_delegate] = false;

        emit DelegateRemoved(_delegate);
    }
}

/**
 * @title User Owned Contract Wallet
 */
contract SmartWallet is UserAuth {
    using SafeMath for uint256;

    IGasToken chi;

    /**
     * @dev sets the "address registry", owner's last activity, owner's active period and initial owner
     */
    function initialize(address _registry, address _user) external {
        require(registry == address(0), "ALREADY INITIALIZED");
        require(_user != address(0), "ZERO ADDRESS");
        registry = _registry;
        owner = _user;
        isDelegate[_user] = true;
        chi = IGasToken(0x0000000000004946c0e9F43F4Dee607b0eF1fA1c);
    }

    /**
        @dev calculates used gas and burns CHI gas tokens accordingly
     */
    modifier discountCHI(bool shouldBurn) {
        uint256 gasStart = gasleft();
        _;

        if (shouldBurn) {
            uint256 gasSpent = gasStart - gasleft();

            uint256 tokensToBurn = (21000 +
                gasSpent +
                16 *
                msg.data.length +
                14154) / 41947;

            //if the user has CHI on his smart wallet, burn from here...
            if (chi.balanceOf(address(this)) > 0)
                chi.freeUpTo(tokensToBurn);
                //if not, try to burn from the users own wallet
            else chi.freeFromUpTo(msg.sender, tokensToBurn);
        }
    }

    /**
        @dev internal function in charge of executing an action
        @dev checks with registry if the target address is allowed to be called
     */
    function _execute(address _target, bytes memory _data)
        internal
        logicAuth(_target)
    {
        require(_target != address(0), "target-invalid");
        assembly {
            let succeeded := delegatecall(
                gas(),
                _target,
                add(_data, 0x20),
                mload(_data),
                0,
                0
            )

            switch iszero(succeeded)
                case 1 {
                    // throw if delegatecall failed
                    let size := returndatasize()
                    returndatacopy(0x00, 0x00, size)
                    revert(0x00, size)
                }
        }
    }

    /**
        @notice main function of the wallet
        @dev executes multiple delegate calls using the internal _execute fx
            burns CHI tokens when shouldBurn is true
        @param targets address array of the logic contracts to use
        @param datas bytes array of the encoded function calls
        @param shouldBurn users decides is they want to burn CHI tokens or not
     */
    function execute(
        address[] calldata targets,
        bytes[] calldata datas,
        bool shouldBurn
    ) external payable auth discountCHI(shouldBurn) {
        for (uint256 i = 0; i < targets.length; i++) {
            _execute(targets[i], datas[i]);
        }
    }

    function getHash(bytes memory data) public view returns(bytes32){
        return keccak256(abi.encodePacked(address(this), nonce, data));
    }

    function executeMetaTransaction(bytes memory sign, bytes memory data) external {
        bytes32 _hash = getHash(data);
        require(isDelegate[address(recover(_hash,sign))], "Invalid Signer");
        address target =  address(this);

        (bool success,) = target.call(data);
        require(success);

        nonce = nonce.add(1);
    }

    function recover(bytes32 hash, bytes memory signature) public pure returns (address) {
        // Check the signature length
        if (signature.length != 65) {
            revert("ECDSA: invalid signature length");
        }

        // Divide the signature in r, s and v variables
        bytes32 r;
        bytes32 s;
        uint8 v;

        // ecrecover takes the signature parameters, and the only way to get them
        // currently is to use assembly.
        // solhint-disable-next-line no-inline-assembly
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        // EIP-2 still allows signature malleability for ecrecover(). Remove this possibility and make the signature
        // unique. Appendix F in the Ethereum Yellow paper (https://ethereum.github.io/yellowpaper/paper.pdf), defines
        // the valid range for s in (281): 0 < s < secp256k1n ÷ 2 + 1, and for v in (282): v ∈ {27, 28}. Most
        // signatures from current libraries generate a unique signature with an s-value in the lower half order.
        //
        // If your library generates malleable signatures, such as s-values in the upper range, calculate a new s-value
        // with 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141 - s1 and flip v from 27 to 28 or
        // vice versa. If your library also generates signatures with 0/1 for v instead 27/28, add 27 to v to accept
        // these malleable signatures as well.
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert("ECDSA: invalid signature 's' value");
        }

        if (v != 27 && v != 28) {
            revert("ECDSA: invalid signature 'v' value");
        }

        // If the signature is valid (and not malleable), return the signer address
        address signer = ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)), v, r, s);
        require(signer != address(0), "ECDSA: invalid signature");

        return signer;
    }


    /// @dev accept ERC721 token transfers
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual returns (bytes4) {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }

    /// @dev accept ERC1155 token transfers
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public virtual returns (bytes4) {
        return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));
    }

    /// @dev accept ERC1155 token batch transfers
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public virtual returns (bytes4) {
        return
            bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"));
    }

    /// @dev accept ETH deposits
    receive() external payable {}
}
