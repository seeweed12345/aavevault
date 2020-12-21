pragma solidity ^0.5.2;

import "../registry/EthaRegistry.sol";

contract EthaRegistryMockV2 is EthaRegistry {
    function foo() external pure returns (string memory) {
        return "buzz";
    }
}
