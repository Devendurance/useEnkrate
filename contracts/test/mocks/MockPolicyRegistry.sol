// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IPolicyRegistry } from "../../src/interfaces/IPolicyRegistry.sol";

contract MockPolicyRegistry is IPolicyRegistry {
    mapping(uint64 => bool) public exists;
    mapping(uint64 => mapping(address => bool)) public authorized;

    function setPolicy(uint64 id, bool exists_, address account, bool authorized_) external {
        exists[id] = exists_;
        authorized[id][account] = authorized_;
    }

    function isAuthorized(uint64 id, address account) external view override returns (bool) {
        return authorized[id][account];
    }

    function policyExists(uint64 id) external view override returns (bool) {
        return exists[id];
    }
}
